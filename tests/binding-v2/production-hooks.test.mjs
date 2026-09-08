import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../../flight-deck-pwa/js/core/EventBus.js';
import { DiagnosticsAccumulator } from '../../shared/diagnostics/Accumulator.js';

test('production hook: disabled PWA diagnostics preserves command arguments/count/order', () => {
  const sent = [];
  const bus = new EventBus({ diagnostics: new DiagnosticsAccumulator({ enabled: false }) });
  bus.setBridgeClient({ sendEvent: (...args) => sent.push(args) });
  bus.publish('SIM_EVENT_DISPATCH', { event: 'com1Swap', value: 0, category: 'K_EVENT', sourceId: 'widget-a' });
  bus.publish('SIM_EVENT_DISPATCH', { event: 'yokeElevatorAxis', value: -400, category: 'K_EVENT', sourceId: 'virtual-yoke-engine' });
  assert.deepEqual(sent, [['com1Swap', 0, 'K_EVENT'], ['yokeElevatorAxis', -400, 'K_EVENT']]);
});

test('production hook: disabled PWA diagnostics preserves telemetry batching output', () => {
  const callbacks = [];
  const oldRaf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => { callbacks.push(callback); return callbacks.length; };
  try {
    const bus = new EventBus({ diagnostics: new DiagnosticsAccumulator({ enabled: false }) });
    const batches = [];
    bus.subscribe('TELEMETRY_STREAM', (value) => batches.push(value));
    bus.ingestTelemetry({ zero: 0, a: 1 });
    bus.ingestTelemetry({ a: 2 });
    assert.equal(callbacks.length, 1);
    callbacks[0]();
    assert.deepEqual(batches, [{ zero: 0, a: 2 }]);
  } finally {
    globalThis.requestAnimationFrame = oldRaf;
  }
});

