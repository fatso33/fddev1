import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeClock } from './helpers/FakeClock.mjs';
import { FakeSimulatorSession } from './helpers/FakeSimulatorSession.mjs';
import { FakeTransport } from './helpers/FakeTransport.mjs';
import { TraceSink } from './helpers/TraceSink.mjs';

test('harness: initial/changed samples and reconnect generations are deterministic', async () => {
  const clock = new FakeClock(); const trace = new TraceSink();
  const sim = new FakeSimulatorSession({ clock, trace });
  sim.connect(); sim.define(10, ['com1']);
  const initial = sim.snapshot(10, { com1: 118.5 }); clock.advance(0);
  assert.deepEqual((await initial).values, { com1: 118.5 });
  sim.reconnect(); sim.define(10, ['com1']);
  const changed = sim.snapshot(10, { com1: 119.1 }, { changed: true }); clock.advance(0);
  assert.equal((await changed).generation, 2);
  assert.equal(trace.byType('sim.connect').length, 2);
});

test('harness: asynchronous failures and out-of-order late replies are observable', async () => {
  const clock = new FakeClock(); const trace = new TraceSink();
  const sim = new FakeSimulatorSession({ clock, trace }); sim.connect(); sim.define(1, ['x']);
  const failed = sim.snapshot(1, {}, { fail: true, delay: 2 });
  const late = sim.callback(1, { requestId: 'old' }, 20);
  const early = sim.callback(1, { requestId: 'new' }, 5);
  clock.advance(5); assert.equal((await early).values.requestId, 'new');
  clock.advance(15); assert.equal((await late).values.requestId, 'old');
  await assert.rejects(failed, /failed/);
});

test('harness: transport ready state, bounded backlog and delayed response', async () => {
  const clock = new FakeClock(); const trace = new TraceSink(3);
  const transport = new FakeTransport({ clock, trace, backlogLimit: 1 });
  await assert.rejects(transport.send({ a: 1 }), /not open/);
  transport.connect(); await transport.send({ zero: 0 });
  await assert.rejects(transport.send({ a: 2 }), /backlog full/);
  assert.deepEqual(transport.drain()[0].payload, { zero: 0 });
  const response = transport.respond('r1', { ok: true }, 5); clock.advance(5);
  assert.deepEqual(await response, { requestId: 'r1', payload: { ok: true } });
  assert.ok(trace.entries.length <= 3);
});

