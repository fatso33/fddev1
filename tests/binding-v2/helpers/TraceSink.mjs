export class TraceSink {
  constructor(limit = 256) { this.limit = limit; this.entries = []; }
  add(type, data = {}) {
    this.entries.push({ type, ...structuredClone(data) });
    if (this.entries.length > this.limit) this.entries.splice(0, this.entries.length - this.limit);
  }
  byType(type) { return this.entries.filter((entry) => entry.type === type); }
}

