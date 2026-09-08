/** Pure bounded metrics accumulator used by opt-in Wave 0 instrumentation. */
export class DiagnosticsAccumulator {
  constructor({ enabled = false, maxSamplesPerMetric = 256, clock = defaultClock, context = {} } = {}) {
    this.enabled = enabled === true;
    this.maxSamplesPerMetric = Math.max(1, Number(maxSamplesPerMetric) || 256);
    this.clock = clock;
    this.context = { ...context };
    this.startedAt = this.clock();
    this.stoppedAt = null;
    this.counts = new Map();
    this.samples = new Map();
    this.aggregates = new Map();
    this.captureGeneration = 0;
    this.timers = new Set();
  }

  count(name, amount = 1) {
    if (!this.enabled || this.stoppedAt !== null) return;
    if (!Number.isFinite(amount)) return;
    this.counts.set(name, (this.counts.get(name) || 0) + amount);
  }

  sample(name, value, metadata) {
    if (!this.enabled || this.stoppedAt !== null || !Number.isFinite(value)) return;
    const aggregate = this.aggregates.get(name) || { count: 0, min: value, max: value, mean: 0, sum: 0, histogram: new Map() };
    aggregate.count++;
    aggregate.sum += value;
    const bucket = value === 0 ? 'zero' : `${value < 0 ? '-' : '+'}:${Math.max(-512, Math.min(511, Math.floor(Math.log2(Math.abs(value)) * 8)))}`;
    aggregate.histogram.set(bucket, (aggregate.histogram.get(bucket) || 0) + 1);
    aggregate.min = Math.min(aggregate.min, value);
    aggregate.max = Math.max(aggregate.max, value);
    aggregate.mean += (value - aggregate.mean) / aggregate.count;
    this.aggregates.set(name, aggregate);
    const values = this.samples.get(name) || [];
    values.push({ at: this.clock(), value, ...(metadata ? { metadata: sanitizeMetadata(metadata) } : {}) });
    if (values.length > this.maxSamplesPerMetric) values.splice(0, values.length - this.maxSamplesPerMetric);
    this.samples.set(name, values);
  }

  begin() {
    if (!this.enabled || this.stoppedAt !== null) return () => undefined;
    const start = this.clock();
    const generation = this.captureGeneration;
    return (name, metadata) => generation === this.captureGeneration && this.sample(name, Math.max(0, this.clock() - start), metadata);
  }

  trackTimer(timerId, clear = clearInterval) {
    if (!this.enabled || this.stoppedAt !== null || timerId === undefined || timerId === null) return timerId;
    this.timers.add({ timerId, clear });
    return timerId;
  }

  stop() {
    for (const entry of this.timers) {
      try { entry.clear(entry.timerId); } catch { /* diagnostics must never interrupt controls */ }
    }
    this.timers.clear();
    if (this.stoppedAt === null) this.stoppedAt = this.clock();
    return this.snapshot();
  }

  // Reset a capture window after warmup. Existing periodic samplers remain attached.
  // stop() is terminal for timer ownership; reset a running recorder for repeat captures.
  reset(context = this.context) {
    if (this.stoppedAt !== null) throw new Error('Cannot reset a stopped recorder; create a new recorder');
    this.captureGeneration++;
    this.counts.clear(); this.samples.clear(); this.aggregates.clear();
    this.context = { ...context }; this.startedAt = this.clock();
    return this.snapshot();
  }

  snapshot() {
    const samples = {};
    for (const [name, entries] of this.samples) {
      const numbers = entries.map((e) => e.value).sort((a, b) => a - b);
      const { histogram, ...aggregate } = this.aggregates.get(name);
      const buckets = [...histogram].map(([key, count]) => {
        if (key === 'zero') return { lower: 0, upper: 0, count };
        const [sign, raw] = key.split(':'); const index = Number(raw);
        const low = index === -512 ? 0 : 2 ** (index / 8);
        const high = index === 511 ? Infinity : 2 ** ((index + 1) / 8);
        return { lower: Math.max(aggregate.min, sign === '-' ? -high : low), upper: Math.min(aggregate.max, sign === '-' ? -low : high), count };
      }).sort((a,b) => a.lower - b.lower);
      const quantileRange = fraction => {
        let count = 0;
        for (const bucket of buckets) { count += bucket.count; if (count >= Math.ceil(aggregate.count * fraction)) return [bucket.lower, bucket.upper]; }
        return null;
      };
      samples[name] = {
        ...aggregate,
        histogram: { method: 'signed-log2-eighth-octave; clamped tails', maxBuckets: 2049, buckets },
        wholeCaptureQuantileRanges: { p50: quantileRange(0.5), p95: aggregate.count >= 20 ? quantileRange(0.95) : null, p99: aggregate.count >= 100 ? quantileRange(0.99) : null },
        scope: 'whole-capture',
        p50: null, p95: null, p99: null,
        percentileStatus: 'whole-capture-ranges-in-wholeCaptureQuantileRanges; tail-point-estimates-only',
        tail: {
          scope: 'most-recent-samples', count: entries.length,
          min: numbers[0] ?? null, max: numbers.at(-1) ?? null,
          p50: percentile(numbers, 0.5),
          p95: numbers.length >= 20 ? percentile(numbers, 0.95) : null,
          p99: numbers.length >= 100 ? percentile(numbers, 0.99) : null
        },
        boundedSamples: entries.map((e) => ({ ...e }))
      };
    }
    return {
      schema: 'flightdeck.binding-v2.diagnostics/0',
      enabled: this.enabled,
      clock: 'monotonic-local-ms',
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      durationMs: (this.stoppedAt ?? this.clock()) - this.startedAt,
      context: sanitizeMetadata(this.context),
      counts: Object.fromEntries(this.counts),
      samples
    };
  }
}

export function diagnosticsEnabled(value) {
  return value === true || value === '1' || value === 'true';
}

function defaultClock() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];
}

function sanitizeMetadata(value) {
  if (!value || typeof value !== 'object') return {};
  const clean = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|certificate|profileContents|ipAddress/i.test(key)) continue;
    if (['string', 'number', 'boolean'].includes(typeof item) || item === null) clean[key] = item;
  }
  return clean;
}
