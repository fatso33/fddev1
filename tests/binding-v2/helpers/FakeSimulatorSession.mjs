export class FakeSimulatorSession {
  constructor({ clock, trace } = {}) {
    this.clock = clock;
    this.trace = trace;
    this.generation = 0;
    this.connected = false;
    this.definitions = new Map();
    this.events = new Map();
  }
  connect() { this.connected = true; this.generation++; this.events.clear(); this.definitions.clear(); this.trace?.add('sim.connect', { generation: this.generation }); }
  disconnect() { this.connected = false; this.trace?.add('sim.disconnect', { generation: this.generation }); }
  reconnect() { this.disconnect(); this.connect(); }
  define(requestId, fields) { this.definitions.set(requestId, { generation: this.generation, fields: structuredClone(fields) }); }
  registerEvent(name, id) { if (!this.connected) throw new Error('simulator disconnected'); this.events.set(name, { id, generation: this.generation }); }
  snapshot(requestId, values, { changed = false, delay = 0, fail = false } = {}) {
    const definition = structuredClone(this.definitions.get(requestId));
    const generation = definition?.generation;
    const capturedValues = structuredClone(values);
    return new Promise((resolve, reject) => this.clock.setTimeout(() => {
      if (fail) { reject(new Error('simulator request failed')); return; }
      const frame = { requestId, generation, definition, values: capturedValues, changed };
      this.trace?.add('sim.frame', frame);
      resolve(frame);
    }, delay));
  }
  callback(requestId, payload, delay = 0) { return this.snapshot(requestId, payload, { delay }); }
}

