export class FakeTransport {
  constructor({ clock, trace, backlogLimit = 8 } = {}) {
    this.clock = clock;
    this.trace = trace;
    this.backlogLimit = backlogLimit;
    this.readyState = 'closed';
    this.backlog = [];
  }
  connect() { this.readyState = 'open'; this.trace?.add('transport.connect'); }
  disconnect() { this.readyState = 'closed'; this.trace?.add('transport.disconnect'); }
  send(payload) {
    if (this.readyState !== 'open') return Promise.reject(new Error('transport not open'));
    if (this.backlog.length >= this.backlogLimit) return Promise.reject(new Error('transport backlog full'));
    const item = { payload: structuredClone(payload), submittedAt: this.clock?.now?.() ?? 0 };
    this.backlog.push(item);
    this.trace?.add('transport.send', item);
    return Promise.resolve(item);
  }
  drain(count = Infinity) { return this.backlog.splice(0, count); }
  respond(requestId, payload, delay = 0) {
    return new Promise((resolve) => this.clock.setTimeout(() => {
      const reply = { requestId, payload: structuredClone(payload) };
      this.trace?.add('transport.response', reply);
      resolve(reply);
    }, delay));
  }
}

