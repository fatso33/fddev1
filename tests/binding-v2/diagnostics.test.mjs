import test from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticsAccumulator } from '../../shared/diagnostics/Accumulator.js';
import { FakeClock } from './helpers/FakeClock.mjs';

test('diagnostics: disabled recorder is behaviorally inert', () => {
  const clock = new FakeClock();
  const diagnostics = new DiagnosticsAccumulator({ enabled: false, clock: clock.now });
  const commands = [];
  for (const value of [0, 2, 2, -1]) {
    diagnostics.count('commands');
    diagnostics.sample('submissionMs', value);
    commands.push(value);
  }
  assert.deepEqual(commands, [0, 2, 2, -1]);
  assert.deepEqual(diagnostics.snapshot().counts, {});
  assert.deepEqual(diagnostics.snapshot().samples, {});
});

test('diagnostics: samples are bounded and insufficient p95/p99 are disclosed', () => {
  const clock = new FakeClock();
  const diagnostics = new DiagnosticsAccumulator({ enabled: true, maxSamplesPerMetric: 4, clock: clock.now });
  for (let i = 0; i < 100; i++) { clock.advance(1); diagnostics.sample('latencyMs', i); }
  const metric = diagnostics.snapshot().samples.latencyMs;
  assert.equal(metric.count, 100);
  assert.equal(metric.tail.count, 4);
  assert.equal(metric.min, 0);
  assert.equal(metric.max, 99);
  assert.deepEqual(metric.boundedSamples.map((entry) => entry.value), [96, 97, 98, 99]);
  assert.equal(metric.p95, null);
  assert.equal(metric.p99, null);
});

test('diagnostics: stop clears tracked timers and redacts sensitive metadata', () => {
  const cleared = [];
  const diagnostics = new DiagnosticsAccumulator({ enabled: true, context: { process: 'test', token: 'nope', certificateKey: 'nope' } });
  diagnostics.trackTimer(7, (id) => cleared.push(id));
  const report = diagnostics.stop();
  diagnostics.count('afterStop');
  assert.deepEqual(cleared, [7]);
  assert.deepEqual(report.context, { process: 'test' });
  assert.equal(diagnostics.snapshot().counts.afterStop, undefined);
});
