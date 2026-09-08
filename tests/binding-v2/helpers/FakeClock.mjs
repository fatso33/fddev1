export class FakeClock {
  constructor(start = 0) {
    this.nowMs = start;
    this.nextId = 1;
    this.tasks = new Map();
  }

  now = () => this.nowMs;

  setTimeout = (callback, delay = 0) => {
    const id = this.nextId++;
    this.tasks.set(id, { id, at: this.nowMs + Math.max(0, delay), callback, interval: null });
    return id;
  };

  setInterval = (callback, delay = 0) => {
    const id = this.nextId++;
    const interval = Math.max(1, delay);
    this.tasks.set(id, { id, at: this.nowMs + interval, callback, interval });
    return id;
  };

  clear = (id) => this.tasks.delete(id);

  advance(ms) {
    const target = this.nowMs + ms;
    while (true) {
      const due = [...this.tasks.values()].filter((t) => t.at <= target).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      this.nowMs = due.at;
      if (due.interval === null) this.tasks.delete(due.id);
      else due.at += due.interval;
      due.callback();
    }
    this.nowMs = target;
  }
}

