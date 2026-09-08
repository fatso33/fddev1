import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  resolveBindingTarget,
  classifyNamespace,
  classifyKTarget,
  transformRawValue,
  compileKTestValue,
  compileKOperation
} = require('../../pc-bridge/kBindingCompiler.cjs');
const { executeKEvent } = require('../../pc-bridge/kEventExecutor.cjs');
const { runKTest, testStructuredKEvent, testKRowEvent } = require('../../pc-bridge/kTestRunner.cjs');
const { decidePaste, parsePastedBinding } = require('../../pc-bridge/bindingPaste.cjs');

const read = (relative) => fs.readFileSync(new URL('../../' + relative, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

// ---- shared fakes ----------------------------------------------------

function makeFakeHandle() {
  const calls = { mapClientEventToSimEvent: [], addClientEventToNotificationGroup: [], setNotificationGroupPriority: [], transmitClientEvent: [] };
  return {
    calls,
    mapClientEventToSimEvent(...args) { calls.mapClientEventToSimEvent.push(args); },
    addClientEventToNotificationGroup(...args) { calls.addClientEventToNotificationGroup.push(args); },
    setNotificationGroupPriority(...args) { calls.setNotificationGroupPriority.push(args); },
    transmitClientEvent(...args) { calls.transmitClientEvent.push(args); }
  };
}

const CONSTANTS = { NOTIFICATION_GROUP_ID: 1, NOTIFICATION_PRIORITY_HIGHEST: 1, OBJECT_ID_USER: 0, EVENT_FLAG_GROUPID_IS_PRIORITY: 16 };

// A tiny stand-in for profileManager.transformValue — the real ProfileManager
// instance is used separately below for the paste/save/reload/runtime test,
// but most of these tests only need the format switch itself.
function transformValue(format, rawValue) {
  const num = parseFloat(rawValue);
  switch (format) {
    case 'FIXED_0': return 0;
    case 'FIXED_1': return 1;
    case 'BCD_HEX':
      if (!/^[0-7]{4}$/.test(String(rawValue))) throw new TypeError('Squawk must be exactly four octal digits (0000-7777).');
      return Number.parseInt(String(rawValue), 16);
    case 'RAW_INT': {
      const integer = Number(rawValue);
      if ((typeof rawValue !== 'number' && typeof rawValue !== 'string') ||
          (typeof rawValue === 'string' && rawValue.trim() === '') ||
          !Number.isFinite(integer) || !Number.isInteger(integer)) {
        throw new TypeError('Value must be a finite integer.');
      }
      return integer;
    }
    default: return isNaN(num) ? 0 : num;
  }
}

// ---- kBindingCompiler.cjs: resolveBindingTarget -----------------------

test('W1C resolveBindingTarget distinguishes explicit raw addresses from logical Deck Events', () => {
  const profile = { name: 'Test', mappings: { COM1_SWAP: { event: 'COM_STBY_RADIO_SWAP', valueFormat: 'FIXED_0' } } };
  const getProfile = () => profile;

  const raw = resolveBindingTarget({ actionName: 'K:XPNDR_IDENT_ON', getProfile });
  assert.deepEqual(raw, { ok: true, source: 'raw', eventTarget: 'K:XPNDR_IDENT_ON', valueFormat: null });

  const rawLower = resolveBindingTarget({ actionName: 'l:S_XPDR_IDENT', getProfile });
  assert.equal(rawLower.ok, true);
  assert.equal(rawLower.source, 'raw');

  const logical = resolveBindingTarget({ actionName: 'COM1_SWAP', getProfile });
  assert.deepEqual(logical, { ok: true, source: 'profile', eventTarget: 'COM_STBY_RADIO_SWAP', valueFormat: 'FIXED_0' });

  // An unmapped logical name is rejected outright — never canonicalized as if
  // it were a raw event just because it looks like one.
  const unmapped = resolveBindingTarget({ actionName: 'XPNDR_IDENT_ON', getProfile });
  assert.equal(unmapped.ok, false);
  assert.equal(unmapped.code, 'no-mapping');
  assert.match(unmapped.reason, /no SimConnect event mapping/);

  const missing = resolveBindingTarget({ actionName: '', getProfile });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, 'missing-action');

  // Defensive: a null/undefined argument must not throw out of destructuring.
  assert.equal(resolveBindingTarget().ok, false);
});

// ---- kBindingCompiler.cjs: classifyKTarget (correction #1) ------------

test('W1C CORRECTION classifyKTarget rejects B:/unknown namespaces and an addressless "K:", and routes H:/A:/L: to a distinct unsupported-adapter code', () => {
  assert.equal(classifyKTarget('K:XPNDR_IDENT_ON').ok, true);
  assert.deepEqual(classifyKTarget('K:XPNDR_IDENT_ON'), { ok: true, eventTarget: 'K:XPNDR_IDENT_ON' });
  assert.deepEqual(classifyKTarget('BARE_EVENT_NAME'), { ok: true, eventTarget: 'BARE_EVENT_NAME' });

  // Root's exact reproduction: B:TEST_Set must never reach an adapter call.
  const bNamespace = classifyKTarget('B:TEST_Set');
  assert.equal(bNamespace.ok, false);
  assert.equal(bNamespace.code, 'unsupported-namespace');

  // Any other unrecognized single-letter namespace is rejected the same way
  // — "unknown namespaces also fall through" is exactly what this closes.
  const unknownNamespace = classifyKTarget('X:SOMETHING');
  assert.equal(unknownNamespace.ok, false);
  assert.equal(unknownNamespace.code, 'unsupported-namespace');

  // Root's exact reproduction: "K:" alone must not register an empty name.
  const emptyK = classifyKTarget('K:');
  assert.equal(emptyK.ok, false);
  assert.equal(emptyK.code, 'invalid-target');
  const emptyKWithSpace = classifyKTarget('K:   ');
  assert.equal(emptyKWithSpace.ok, false);
  assert.equal(emptyKWithSpace.code, 'invalid-target');

  for (const ns of ['H', 'L', 'A']) {
    const result = classifyKTarget(`${ns}:SOMETHING`);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'unsupported-adapter', `${ns}: must use the distinct unsupported-adapter code, not unsupported-namespace`);
  }

  assert.equal(classifyKTarget('').ok, false);
  assert.equal(classifyKTarget('').code, 'missing-event');
  assert.equal(classifyKTarget(undefined).code, 'missing-event');
  assert.equal(classifyKTarget(null).code, 'missing-event');
  assert.equal(classifyKTarget('   ').code, 'missing-event');
});

test('W1C classifyNamespace / transformRawValue / compileKOperation strip K: exactly once, and reject an invalid target with no partial result', () => {
  assert.equal(classifyNamespace('K:EXAMPLE'), 'K:');
  assert.equal(classifyNamespace('EXAMPLE'), null);
  assert.equal(classifyNamespace('L:TEST'), 'L:');

  assert.equal(transformRawValue({ valueFormat: null, rawValue: '5', transformValue }), 5);
  assert.equal(transformRawValue({ valueFormat: 'FIXED_1', rawValue: 0, transformValue }), 1);

  const explicitK = compileKOperation({ eventTarget: 'K:XPNDR_IDENT_ON', value: 1 });
  assert.deepEqual(explicitK, { ok: true, eventName: 'XPNDR_IDENT_ON', value: 1 });

  // Bare (unprefixed) mapping.event defaults to a raw K:Event, matching
  // pre-Wave-1C dispatchSimEvent behavior — no "K:" to strip, name unchanged.
  const bareK = compileKOperation({ eventTarget: 'COM_STBY_RADIO_SWAP', value: 0 });
  assert.deepEqual(bareK, { ok: true, eventName: 'COM_STBY_RADIO_SWAP', value: 0 });

  // compileKOperation is itself the common compilation boundary — an invalid
  // target is rejected here too, not only via a separate pre-check callers
  // might forget to make.
  const rejected = compileKOperation({ eventTarget: 'B:TEST_Set', value: 1 });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, 'unsupported-namespace');
  assert.equal(Object.hasOwn(rejected, 'eventName'), false);
});

// ---- kBindingCompiler.cjs: compileKTestValue (correction #2) ----------

test('W1C CORRECTION compileKTestValue rejects missing/malformed samples instead of silently defaulting to zero, and preserves explicit zero/signed/BCD/fixed semantics', () => {
  // Root's exact reproduction: an omitted rawValue with no valueFormat must
  // not become 0 via Number(rawValue) || 0.
  const missingNoFormat = compileKTestValue({ valueFormat: null, rawValue: undefined, transformValue });
  assert.equal(missingNoFormat.ok, false);
  assert.equal(missingNoFormat.code, 'missing-value');

  // Root's exact reproduction: 'oops' must not become 0.
  const malformed = compileKTestValue({ valueFormat: null, rawValue: 'oops', transformValue });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.code, 'invalid-value');

  // Explicit zero is preserved — 0 is not "missing" or "malformed".
  const explicitZero = compileKTestValue({ valueFormat: null, rawValue: 0, transformValue });
  assert.deepEqual(explicitZero, { ok: true, value: 0 });
  const explicitZeroString = compileKTestValue({ valueFormat: null, rawValue: '0', transformValue });
  assert.deepEqual(explicitZeroString, { ok: true, value: 0 });

  // Valid signed axis input (e.g. AXIS_ELEVATOR_SET's -16383..16383 range).
  const signedAxis = compileKTestValue({ valueFormat: null, rawValue: -16383, transformValue });
  assert.deepEqual(signedAxis, { ok: true, value: -16383 });

  // Strict BCD/squawk strings, including 0000 and a leading zero, still work
  // and still reject a malformed squawk with a structured (not thrown) result.
  assert.deepEqual(compileKTestValue({ valueFormat: 'BCD_HEX', rawValue: '0000', transformValue }), { ok: true, value: 0 });
  assert.deepEqual(compileKTestValue({ valueFormat: 'BCD_HEX', rawValue: '0123', transformValue }), { ok: true, value: 0x0123 });
  const badSquawk = compileKTestValue({ valueFormat: 'BCD_HEX', rawValue: '9999', transformValue });
  assert.equal(badSquawk.ok, false);
  assert.equal(badSquawk.code, 'invalid-value');
  assert.match(badSquawk.reason, /Squawk must be exactly four octal digits/);
  const missingSquawk = compileKTestValue({ valueFormat: 'BCD_HEX', rawValue: undefined, transformValue });
  assert.equal(missingSquawk.ok, false);
  assert.equal(missingSquawk.code, 'missing-value');

  // FIXED_0/FIXED_1 ignore the sample by design — no sample is required.
  assert.deepEqual(compileKTestValue({ valueFormat: 'FIXED_0', rawValue: undefined, transformValue }), { ok: true, value: 0 });
  assert.deepEqual(compileKTestValue({ valueFormat: 'FIXED_1', rawValue: undefined, transformValue }), { ok: true, value: 1 });
  assert.deepEqual(compileKTestValue({ valueFormat: 'FIXED_0', rawValue: 'ignored-garbage', transformValue }), { ok: true, value: 0 });

  // RAW_INT still requires a finite integer, structured rejection not a throw.
  const nonIntegerRaw = compileKTestValue({ valueFormat: 'RAW_INT', rawValue: 1.5, transformValue });
  assert.equal(nonIntegerRaw.ok, false);
  assert.equal(nonIntegerRaw.code, 'invalid-value');

  // An unrecognized format is rejected outright — never falls into a
  // permissive legacy default that silently returns 0.
  const unsupportedFormat = compileKTestValue({ valueFormat: 'NOT_A_REAL_FORMAT', rawValue: 5, transformValue });
  assert.equal(unsupportedFormat.ok, false);
  assert.equal(unsupportedFormat.code, 'unsupported-format');

  // Empty string is treated as "no sample supplied", same as undefined/null.
  const emptyString = compileKTestValue({ valueFormat: null, rawValue: '', transformValue });
  assert.equal(emptyString.ok, false);
  assert.equal(emptyString.code, 'missing-value');
});

// ---- kEventExecutor.cjs -------------------------------------------------

test('W1C executeKEvent registers once, reuses the mappedId, and unsigned-converts a negative value', () => {
  const handle = makeFakeHandle();
  const registry = new Map();
  let nextId = 8000;
  const allocateMappedId = () => nextId++;

  const first = executeKEvent({ handle, registry, allocateMappedId, constants: CONSTANTS, eventName: 'AXIS_ELEVATOR_SET', value: -16383 });
  const second = executeKEvent({ handle, registry, allocateMappedId, constants: CONSTANTS, eventName: 'AXIS_ELEVATOR_SET', value: 16383 });

  assert.equal(first.mappedId, second.mappedId, 'the same event name must reuse its mappedId');
  assert.equal(handle.calls.mapClientEventToSimEvent.length, 1, 'registration must happen exactly once per event name');
  assert.equal(handle.calls.transmitClientEvent.length, 2);
  assert.equal(handle.calls.transmitClientEvent[0][2], (-16383) >>> 0);
  assert.equal(handle.calls.transmitClientEvent[1][2], 16383);
  assert.equal(handle.calls.transmitClientEvent[0][0], CONSTANTS.OBJECT_ID_USER);
  assert.equal(handle.calls.transmitClientEvent[0][3], CONSTANTS.NOTIFICATION_GROUP_ID);
  assert.equal(handle.calls.transmitClientEvent[0][4], CONSTANTS.EVENT_FLAG_GROUPID_IS_PRIORITY);
});

// ---- kTestRunner.cjs ------------------------------------------------------

test('W1C runKTest rejects H:/A:/L: targets, disconnected sim, and adapter exceptions without transmitting', () => {
  const handle = makeFakeHandle();
  const registry = new Map();
  const allocateMappedId = () => 9000;

  const hRejected = runKTest({ eventTarget: 'H:AS1000_PFD_SOFTKEY_1', valueFormat: null, rawValue: 1, connected: true, handle, registry, allocateMappedId, constants: CONSTANTS, transformValue });
  assert.equal(hRejected.ok, false);
  assert.equal(hRejected.code, 'unsupported-adapter');

  const aRejected = runKTest({ eventTarget: 'A:TRANSPONDER STATE:1, Enum', valueFormat: null, rawValue: 1, connected: true, handle, registry, allocateMappedId, constants: CONSTANTS, transformValue });
  assert.equal(aRejected.ok, false);
  assert.equal(aRejected.code, 'unsupported-adapter');

  const notConnected = runKTest({ eventTarget: 'K:XPNDR_IDENT_ON', valueFormat: null, rawValue: 1, connected: false, handle, registry, allocateMappedId, constants: CONSTANTS, transformValue });
  assert.equal(notConnected.ok, false);
  assert.equal(notConnected.code, 'not-connected');

  const invalidValue = runKTest({ eventTarget: 'K:XPNDR_SET', valueFormat: 'BCD_HEX', rawValue: 'not-a-squawk', connected: true, handle, registry, allocateMappedId, constants: CONSTANTS, transformValue });
  assert.equal(invalidValue.ok, false);
  assert.equal(invalidValue.code, 'invalid-value');

  const throwingHandle = { transmitClientEvent() { throw new Error('SIMCONNECT_EXCEPTION_ERROR'); } };
  const adapterException = runKTest({ eventTarget: 'K:XPNDR_IDENT_ON', valueFormat: null, rawValue: 1, connected: true, handle: throwingHandle, registry: new Map(), allocateMappedId, constants: CONSTANTS, transformValue });
  assert.equal(adapterException.ok, false);
  assert.equal(adapterException.code, 'adapter-exception');

  // CORRECTION reproductions: B:TEST_Set, missing rawValue, 'oops', and a
  // bare "K:" must all be rejected with zero adapter calls too.
  const bTarget = runKTest({ eventTarget: 'B:TEST_Set', valueFormat: null, rawValue: 1, connected: true, handle, registry, allocateMappedId, constants: CONSTANTS, transformValue });
  assert.equal(bTarget.ok, false);
  assert.equal(bTarget.code, 'unsupported-namespace');

  const missingRawValue = runKTest({ eventTarget: 'K:XPNDR_IDENT_ON', valueFormat: null, rawValue: undefined, connected: true, handle, registry, allocateMappedId, constants: CONSTANTS, transformValue });
  assert.equal(missingRawValue.ok, false);
  assert.equal(missingRawValue.code, 'missing-value');

  const malformedRawValue = runKTest({ eventTarget: 'K:XPNDR_IDENT_ON', valueFormat: null, rawValue: 'oops', connected: true, handle, registry, allocateMappedId, constants: CONSTANTS, transformValue });
  assert.equal(malformedRawValue.ok, false);
  assert.equal(malformedRawValue.code, 'invalid-value');

  const emptyKTarget = runKTest({ eventTarget: 'K:', valueFormat: null, rawValue: 1, connected: true, handle, registry, allocateMappedId, constants: CONSTANTS, transformValue });
  assert.equal(emptyKTarget.ok, false);
  assert.equal(emptyKTarget.code, 'invalid-target');

  // None of the rejected paths made it to the (unmapped) adapter's transmit call.
  assert.equal(handle.calls.transmitClientEvent.length, 0);
  assert.equal(handle.calls.mapClientEventToSimEvent.length, 0);
});

test('W1C runKTest success reports local submission only — no executed/observed claim — and preserves explicit zero', () => {
  const handle = makeFakeHandle();
  const result = runKTest({ eventTarget: 'K:XPNDR_IDENT_ON', valueFormat: null, rawValue: 1, connected: true, handle, registry: new Map(), allocateMappedId: () => 9001, constants: CONSTANTS, transformValue });
  assert.equal(result.ok, true);
  assert.equal(result.submitted, true);
  assert.equal(result.eventName, 'XPNDR_IDENT_ON');
  assert.equal(result.value, 1);
  assert.equal(Object.hasOwn(result, 'executed'), false);
  assert.equal(Object.hasOwn(result, 'observed'), false);
  assert.equal(handle.calls.transmitClientEvent.length, 1);

  // Explicit zero must still submit (not be confused with "no value given").
  const zeroResult = runKTest({ eventTarget: 'K:COM1_RADIO_SWAP', valueFormat: null, rawValue: 0, connected: true, handle, registry: new Map(), allocateMappedId: () => 9002, constants: CONSTANTS, transformValue });
  assert.equal(zeroResult.ok, true);
  assert.equal(zeroResult.value, 0);
});

test('W1C runKTest defaults its argument to {} — a null/undefined call produces a structured rejection, not a destructuring throw', () => {
  assert.doesNotThrow(() => runKTest());
  const result = runKTest();
  assert.equal(result.ok, false);
  assert.equal(result.code, 'missing-event');
});

test('W1C testStructuredKEvent resolves raw and logical actionNames identically to production dispatch, and rejects an unknown logical name', () => {
  const profile = { name: 'C172', mappings: { XPNDR_IDENT: { event: 'K:XPNDR_IDENT_ON', valueFormat: null } } };
  const getProfile = () => profile;

  const handle = makeFakeHandle();
  const raw = testStructuredKEvent({ actionName: 'K:XPNDR_IDENT_ON', rawValue: 1, getProfile, connected: true, handle, registry: new Map(), allocateMappedId: () => 9010, constants: CONSTANTS, transformValue });
  assert.equal(raw.ok, true);
  assert.equal(raw.source, 'raw');
  assert.equal(raw.eventName, 'XPNDR_IDENT_ON');

  const logical = testStructuredKEvent({ actionName: 'XPNDR_IDENT', rawValue: 1, getProfile, connected: true, handle, registry: new Map(), allocateMappedId: () => 9011, constants: CONSTANTS, transformValue });
  assert.equal(logical.ok, true);
  assert.equal(logical.source, 'profile');
  assert.equal(logical.eventName, 'XPNDR_IDENT_ON');
  assert.deepEqual({ eventName: raw.eventName, value: raw.value }, { eventName: logical.eventName, value: logical.value });

  const unknown = testStructuredKEvent({ actionName: 'NOT_A_REAL_DECK_EVENT', rawValue: 1, getProfile, connected: true, handle, registry: new Map(), allocateMappedId: () => 9012, constants: CONSTANTS, transformValue });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.code, 'no-mapping');

  // Defensive: undefined argument must not throw out of destructuring.
  assert.doesNotThrow(() => testStructuredKEvent());
  assert.equal(testStructuredKEvent().ok, false);
});

test('W1C testKRowEvent rejects a missing or non-K row event, reports unsupported for H:/A:/L: rows, and rejects a missing/malformed sample value', () => {
  const handle = makeFakeHandle();
  const missing = testKRowEvent({ eventTarget: '', valueFormat: 'RAW_INT', rawValue: 1, connected: true, handle, registry: new Map(), allocateMappedId: () => 9020, constants: CONSTANTS, transformValue });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, 'missing-event');

  const lRow = testKRowEvent({ eventTarget: 'L:S_XPDR_IDENT', valueFormat: 'FIXED_1', rawValue: 1, connected: true, handle, registry: new Map(), allocateMappedId: () => 9021, constants: CONSTANTS, transformValue });
  assert.equal(lRow.ok, false);
  assert.equal(lRow.code, 'unsupported-adapter');

  // CORRECTION reproductions, via the row-test entry point specifically.
  const bRow = testKRowEvent({ eventTarget: 'B:TEST_Set', valueFormat: 'RAW_INT', rawValue: 1, connected: true, handle, registry: new Map(), allocateMappedId: () => 9022, constants: CONSTANTS, transformValue });
  assert.equal(bRow.ok, false);
  assert.equal(bRow.code, 'unsupported-namespace');

  const emptyKRow = testKRowEvent({ eventTarget: 'K:', valueFormat: 'RAW_INT', rawValue: 1, connected: true, handle, registry: new Map(), allocateMappedId: () => 9023, constants: CONSTANTS, transformValue });
  assert.equal(emptyKRow.ok, false);
  assert.equal(emptyKRow.code, 'invalid-target');

  const missingValueRow = testKRowEvent({ eventTarget: 'K:XPNDR_SET', valueFormat: 'RAW_INT', rawValue: undefined, connected: true, handle, registry: new Map(), allocateMappedId: () => 9024, constants: CONSTANTS, transformValue });
  assert.equal(missingValueRow.ok, false);
  assert.equal(missingValueRow.code, 'missing-value');

  const malformedValueRow = testKRowEvent({ eventTarget: 'K:XPNDR_SET', valueFormat: 'RAW_INT', rawValue: 'oops', connected: true, handle, registry: new Map(), allocateMappedId: () => 9025, constants: CONSTANTS, transformValue });
  assert.equal(malformedValueRow.ok, false);
  assert.equal(malformedValueRow.code, 'invalid-value');

  assert.equal(handle.calls.transmitClientEvent.length, 0);

  // Defensive: undefined argument must not throw.
  assert.doesNotThrow(() => testKRowEvent());
  assert.equal(testKRowEvent().ok, false);
});

// ---- acceptance: parsed 0/1 -> paste -> save/reload -> runtime matches structured Test ----

test('W1C paste -> save/reload -> runtime and unsaved-row structured Test resolve to the same event/value', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'flightdeck-wave1c-'));
  const previousStorage = process.env.PORTABLE_EXECUTABLE_DIR;
  process.env.PORTABLE_EXECUTABLE_DIR = tempRoot;
  try {
    const { ProfileManager } = await import(`../../pc-bridge/profileManager.js?wave1c=${Date.now()}`);
    const manager = new ProfileManager();
    const base = manager.getActiveProfile();
    const mappings = structuredClone(base.mappings);

    // Paste "0 (>K:WAVE1C_EXAMPLE)" onto an editable write row, exactly as
    // Wave 1B's decidePaste() would, then save it under a logical name.
    const parsed = parsePastedBinding('0 (>K:WAVE1C_EXAMPLE)');
    const decision = decidePaste(parsed, { kind: 'write', editable: true, valueFormat: 'RAW_INT', formatEditable: true });
    assert.equal(decision.ok, true);
    assert.deepEqual(decision.changes, { event: 'K:WAVE1C_EXAMPLE', valueFormat: 'FIXED_0' });
    mappings.wave1cExample = { event: decision.changes.event, valueFormat: decision.changes.valueFormat, userEdited: true };
    manager.saveProfile({ id: 'wave1c-roundtrip', name: 'Wave 1C', mappings, simVars: structuredClone(base.simVars) });

    // Reload from disk, as a fresh Bridge process would.
    const reloaded = new ProfileManager();
    assert.equal(reloaded.setActiveProfile('wave1c-roundtrip'), true);
    const profile = reloaded.getActiveProfile();
    const getProfile = () => profile;
    const transformFromManager = (fmt, v) => reloaded.transformValue(fmt, v);

    // "Runtime" path: production dispatch resolving the logical name, using
    // the exact same transformRawValue()/compileKOperation() dispatchSimEvent
    // itself calls (see the vm-slice equivalence test below for a direct
    // comparison against the real dispatchSimEvent() source).
    const runtimeResolved = resolveBindingTarget({ actionName: 'wave1cExample', getProfile });
    assert.equal(runtimeResolved.ok, true);
    const runtimeValue = transformRawValue({ valueFormat: runtimeResolved.valueFormat, rawValue: 1, transformValue: transformFromManager });
    const runtimeCompiled = compileKOperation({ eventTarget: runtimeResolved.eventTarget, value: runtimeValue });

    // Structured Test path, via the same logical name.
    const handle = makeFakeHandle();
    const testResult = testStructuredKEvent({ actionName: 'wave1cExample', rawValue: 1, getProfile, connected: true, handle, registry: new Map(), allocateMappedId: () => 9030, constants: CONSTANTS, transformValue: transformFromManager });

    assert.deepEqual(
      { eventName: runtimeCompiled.eventName, value: runtimeCompiled.value },
      { eventName: testResult.eventName, value: testResult.value }
    );
    assert.deepEqual({ eventName: runtimeCompiled.eventName, value: runtimeCompiled.value }, { eventName: 'WAVE1C_EXAMPLE', value: 0 });

    // Unsaved-row Test, using the row's own (already-saved-in-this-case)
    // fields directly, must match too.
    const rowResult = testKRowEvent({ eventTarget: profile.mappings.wave1cExample.event, valueFormat: profile.mappings.wave1cExample.valueFormat, rawValue: 1, connected: true, handle, registry: new Map(), allocateMappedId: () => 9031, constants: CONSTANTS, transformValue: transformFromManager });
    assert.deepEqual({ eventName: rowResult.eventName, value: rowResult.value }, { eventName: 'WAVE1C_EXAMPLE', value: 0 });

    // Testing must not have mutated the reloaded profile or written to disk.
    const profileAfter = reloaded.getActiveProfile();
    assert.deepEqual(profileAfter.mappings.wave1cExample, profile.mappings.wave1cExample);
    const rereloaded = new ProfileManager();
    assert.equal(rereloaded.setActiveProfile('wave1c-roundtrip'), true);
    assert.deepEqual(rereloaded.getActiveProfile().mappings.wave1cExample, profile.mappings.wave1cExample);
  } finally {
    if (previousStorage === undefined) delete process.env.PORTABLE_EXECUTABLE_DIR;
    else process.env.PORTABLE_EXECUTABLE_DIR = previousStorage;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

// ---- CORRECTION #5: production dispatchSimEvent vs. structured Test, via the real source ----

test('W1C CORRECTION dispatchSimEvent (real source, vm-sliced) and testStructuredKEvent/testKRowEvent transmit the identical eventName/value for a raw and a mapped K target', () => {
  const server = read('pc-bridge/server.js');
  const dispatchText = server.slice(server.indexOf('function dispatchSimEvent('), server.indexOf('\n/**\n * Creates (idempotent'));

  const profile = { name: 'Test', mappings: { XPNDR_IDENT: { event: 'K:XPNDR_IDENT_ON', valueFormat: null }, XPNDR_SET: { event: 'K:XPNDR_SET', valueFormat: 'BCD_HEX' } } };
  const getProfile = () => profile;

  function runProduction(actionName, rawValue) {
    const calls = [];
    const context = {
      PREFIXED_VAR_RE: /^[ALHK]:/i,
      resolveBindingTarget,
      compileKOperation,
      transformRawValue,
      executeKEvent,
      K_EXECUTOR_CONSTANTS: () => CONSTANTS,
      profileManager: { getActiveProfile: getProfile, transformValue },
      console: { warn() {} },
      notifyDispatchFailure: (...args) => calls.push(['failure', ...args]),
      dispatchSimVarWrite: (...args) => calls.push(['write', ...args]),
      simConnectHandle: { mapClientEventToSimEvent() {}, addClientEventToNotificationGroup() {}, setNotificationGroupPriority() {}, transmitClientEvent: (...a) => calls.push(['transmit', ...a]) },
      isSimConnected: true,
      dynamicRegisteredEvents: new Map(),
      nextDynamicMappedId: 1,
      NOTIFICATION_GROUP_ID: CONSTANTS.NOTIFICATION_GROUP_ID,
      NOTIFICATION_PRIORITY_HIGHEST: CONSTANTS.NOTIFICATION_PRIORITY_HIGHEST,
      SimConnectConstants: { OBJECT_ID_USER: CONSTANTS.OBJECT_ID_USER },
      EventFlag: { EVENT_FLAG_GROUPID_IS_PRIORITY: CONSTANTS.EVENT_FLAG_GROUPID_IS_PRIORITY },
      bindingV2Diagnostics: { begin: () => () => {}, count() {} }
    };
    vm.createContext(context);
    vm.runInContext(dispatchText, context);
    vm.runInContext(`dispatchSimEvent(${JSON.stringify(actionName)}, ${JSON.stringify(rawValue)})`, context);
    const transmit = calls.find((call) => call[0] === 'transmit');
    assert.ok(transmit, `expected a transmit call for ${actionName}`);
    // transmitClientEvent(OBJECT_ID_USER, mappedId, value, groupId, flag) —
    // calls entries are ['transmit', ...args], so value is index 3.
    return { value: transmit[3] };
  }

  const handle = makeFakeHandle();

  // Raw target.
  const productionRaw = runProduction('K:XPNDR_IDENT_ON', 1);
  const testRaw = testStructuredKEvent({ actionName: 'K:XPNDR_IDENT_ON', rawValue: 1, getProfile, connected: true, handle, registry: new Map(), allocateMappedId: () => 9040, constants: CONSTANTS, transformValue });
  assert.equal(testRaw.ok, true);
  assert.equal(testRaw.eventName, 'XPNDR_IDENT_ON');
  assert.equal(productionRaw.value, testRaw.value);

  // Mapped logical target with a squawk value format, leading zero preserved.
  const productionMapped = runProduction('XPNDR_SET', '0123');
  const testMapped = testStructuredKEvent({ actionName: 'XPNDR_SET', rawValue: '0123', getProfile, connected: true, handle, registry: new Map(), allocateMappedId: () => 9041, constants: CONSTANTS, transformValue });
  assert.equal(testMapped.ok, true);
  assert.equal(testMapped.eventName, 'XPNDR_SET');
  assert.equal(productionMapped.value, testMapped.value);
  assert.equal(productionMapped.value, 0x0123);

  // The row-test entry point (raw eventTarget/valueFormat, no profile lookup)
  // must also match production for the same effective input.
  const rowTest = testKRowEvent({ eventTarget: 'K:XPNDR_SET', valueFormat: 'BCD_HEX', rawValue: '0123', connected: true, handle, registry: new Map(), allocateMappedId: () => 9042, constants: CONSTANTS, transformValue });
  assert.equal(rowTest.ok, true);
  assert.equal(rowTest.value, productionMapped.value);
});

// ---- Studio Fire & Watch raw-K addressing fix -----------------------------

function makeStudioTesterFixture() {
  const els = {};
  const get = (id, init) => els[id] || (els[id] = { ...init });
  const container = {
    querySelector(sel) {
      const id = sel.replace('#', '');
      switch (id) {
        case 'svt-input': return get(id, { value: '' });
        case 'svt-result': return get(id, { textContent: '' });
        case 'svt-test': return get(id, { disabled: true });
        case 'svt-fw-event': return get(id, { value: '' });
        case 'svt-fw-value': return get(id, { value: '' });
        case 'svt-fw-simvar': return get(id, { value: '' });
        case 'svt-fw-unit': return get(id, { value: '' });
        default: return null;
      }
    }
  };
  return { els, container };
}

test('W1C Studio Fire & Watch keeps the K: prefix for both explicit and bare-K pastes, so it addresses a raw K target rather than a logical Deck Event', async () => {
  const { StudioSimVarTester } = await import('../../widget-studio/js/StudioSimVarTester.js');
  const tester = Object.create(StudioSimVarTester.prototype);

  const explicit = makeStudioTesterFixture();
  Object.assign(tester, { container: explicit.container, state: { setTesterParsed() {} } });
  explicit.container.querySelector('#svt-input').value = '1 (>K:XPNDR_IDENT_ON)';
  tester.handleParse();
  assert.equal(explicit.els['svt-fw-event'].value, 'K:XPNDR_IDENT_ON');

  const bare = makeStudioTesterFixture();
  Object.assign(tester, { container: bare.container, state: { setTesterParsed() {} } });
  bare.container.querySelector('#svt-input').value = '1 (>XPNDR_IDENT_ON)';
  tester.handleParse();
  assert.equal(bare.els['svt-fw-event'].value, 'K:XPNDR_IDENT_ON', 'a bare (no explicit namespace) write target still defaults to a raw K:Event and must keep the K: marker so dispatchSimEvent treats it as raw, not a logical Deck Event lookup');
});
