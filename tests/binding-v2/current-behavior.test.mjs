import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { StudioBridgeAdapter } from '../../widget-studio/js/StudioBridgeAdapter.js';

const require = createRequire(import.meta.url);
const { parsePastedBinding } = require('../../pc-bridge/bindingPaste.cjs');
// Wave 1C: dispatchSimEvent() now delegates resolution/execution to these
// shared modules (see kBindingCompiler.cjs/kEventExecutor.cjs), so the
// dispatchSimEvent source slice below needs the real implementations in its
// vm context too — same as PREFIXED_VAR_RE/profileManager/etc. already were.
const { resolveBindingTarget, transformRawValue, compileKOperation } = require('../../pc-bridge/kBindingCompiler.cjs');
const { executeKEvent } = require('../../pc-bridge/kEventExecutor.cjs');

const read = (path) => fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const profile = read('pc-bridge/profileManager.js');
const server = read('pc-bridge/server.js');
const configUi = read('pc-bridge/config-ui.html');
const deviceView = read('widget-studio/js/StudioDeviceView.js');
const transponderWidget = JSON.parse(read('garmin-widgets/radios-atc/com_flightdeck_garmin_transponder.fdwidget'));

function extractedCurrentFunctions() {
  const transformText = profile.slice(profile.indexOf('  transformValue(format'), profile.indexOf('\nexport const profileManager'));
  const transform = vm.runInNewContext('({' + transformText.slice(0, transformText.lastIndexOf('\n}')) + '}).transformValue');
  return { parse: parsePastedBinding, transform };
}

test('W1-01: transponder mode keeps the incoming enum through profile save and runtime transform', async () => {
  const { transform } = extractedCurrentFunctions();
  assert.match(profile, /xpndrModeSet:.*valueFormat: 'RAW_INT'/);
  assert.equal(transform('FIXED_0', 4), 0, 'legacy fixed-zero semantics remain constant');
  assert.equal(transform('FIXED_1', 4), 1, 'legacy fixed-one semantics remain constant');
  for (const mode of [0, 1, 2, 3, 4, 5]) assert.equal(transform('RAW_INT', mode), mode);
  for (const invalid of [NaN, Infinity, -Infinity, '', 'ALT', 1.5, null, true, [], {}]) {
    assert.throws(() => transform('RAW_INT', invalid), /finite integer/);
  }

  const selector = transponderWidget.components.find((component) => component.binding?.writeEvent === 'xpndrModeSet');
  const modeState = transponderWidget.state.find((entry) => entry.name === 'xpndrMode');
  assert.deepEqual(modeState, { name: 'xpndrMode', type: 'number', default: 4, syncFrom: 'xpndrModeState' });
  assert.deepEqual(
    selector.props.positions.map(({ value, label }) => ({ value, label })),
    [
      { value: 5, label: 'GND' },
      { value: 1, label: 'SBY' },
      { value: 3, label: 'ON' },
      { value: 4, label: 'ALT' },
      { value: 2, label: 'TST' }
    ]
  );

  const dispatchText = server.slice(server.indexOf('function dispatchSimEvent('), server.indexOf('\n/**\n * Creates (idempotent'));
  const writes = [];
  const dispatchContext = {
    PREFIXED_VAR_RE: /^[ALHK]:/i,
    resolveBindingTarget,
    compileKOperation,
    transformRawValue,
    executeKEvent,
    K_EXECUTOR_CONSTANTS: () => ({ NOTIFICATION_GROUP_ID: 1, NOTIFICATION_PRIORITY_HIGHEST: 1, OBJECT_ID_USER: 0, EVENT_FLAG_GROUPID_IS_PRIORITY: 1 }),
    profileManager: {
      getActiveProfile: () => ({ name: 'Default', mappings: { xpndrModeSet: { event: 'A:TRANSPONDER STATE:1, Enum', valueFormat: 'RAW_INT' } } }),
      transformValue: transform
    },
    console: { warn() {} },
    notifyDispatchFailure: (...args) => writes.push(['failure', ...args]),
    dispatchSimVarWrite: (...args) => writes.push(['write', ...args]),
    simConnectHandle: {},
    isSimConnected: true,
    dynamicRegisteredEvents: new Map(),
    nextDynamicMappedId: 1,
    NOTIFICATION_GROUP_ID: 1,
    NOTIFICATION_PRIORITY_HIGHEST: 1,
    SimConnectConstants: { OBJECT_ID_USER: 0 },
    EventFlag: { EVENT_FLAG_GROUPID_IS_PRIORITY: 1 },
    bindingV2Diagnostics: { begin: () => () => {}, count() {} }
  };
  vm.createContext(dispatchContext);
  vm.runInContext(dispatchText, dispatchContext);
  for (const mode of [0, 1, 2, 3, 4, 5]) vm.runInContext(`dispatchSimEvent('xpndrModeSet', ${mode})`, dispatchContext);
  assert.deepEqual(
    writes.filter((call) => call[0] === 'write').map((call) => call.slice(1)),
    [0, 1, 2, 3, 4, 5].map((mode) => ['A:TRANSPONDER STATE:1, Enum', mode])
  );

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'flightdeck-wave1a-'));
  const previousStorage = process.env.PORTABLE_EXECUTABLE_DIR;
  process.env.PORTABLE_EXECUTABLE_DIR = tempRoot;
  try {
    const { ProfileManager } = await import(`../../pc-bridge/profileManager.js?wave1a=${Date.now()}`);
    const manager = new ProfileManager();
    const base = manager.getActiveProfile();
    assert.equal(base.mappings.xpndrModeSet.valueFormat, 'RAW_INT');

    manager.saveProfile({
      id: 'inherits-default',
      name: 'Inherits Default',
      mappings: structuredClone(base.mappings),
      simVars: structuredClone(base.simVars)
    });
    const reloaded = new ProfileManager();
    assert.equal(reloaded.setActiveProfile('inherits-default'), true);
    assert.equal(reloaded.getActiveProfile().mappings.xpndrModeSet.valueFormat, 'RAW_INT');
    assert.equal(reloaded.transformValue('RAW_INT', 4), 4);

    const override = { event: 'L:CUSTOM_XPDR_MODE, Number', valueFormat: 'FIXED_1', userEdited: true };
    assert.equal(reloaded.setProfileRow('inherits-default', 'mappings', 'xpndrModeSet', override), true);
    const withOverride = new ProfileManager();
    assert.equal(withOverride.setActiveProfile('inherits-default'), true);
    assert.deepEqual(withOverride.getActiveProfile().mappings.xpndrModeSet, override);
  } finally {
    if (previousStorage === undefined) delete process.env.PORTABLE_EXECUTABLE_DIR;
    else process.env.PORTABLE_EXECUTABLE_DIR = previousStorage;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('W1-01: strict squawk encoding preserves zero and leading zeroes through dispatch', () => {
  const { transform } = extractedCurrentFunctions();
  for (const [logical, encoded] of [['0000', 0], ['0001', 0x0001], ['0123', 0x0123], ['1200', 0x1200], ['7777', 0x7777]]) {
    assert.equal(transform('BCD_HEX', logical), encoded);
  }
  for (const invalid of ['123', '01234', '1280', '8888', '-001', '12A0', '', 123, NaN, Infinity]) {
    assert.throws(() => transform('BCD_HEX', invalid), /four octal digits/);
  }
  assert.match(server, /hasOwnProperty\.call\(parsed, 'value'\) \? parsed\.value : 0;/);

  const dispatchText = server.slice(server.indexOf('function dispatchSimEvent('), server.indexOf('\n/**\n * Creates (idempotent'));
  const calls = [];
  const context = {
    PREFIXED_VAR_RE: /^[ALHK]:/i,
    resolveBindingTarget,
    compileKOperation,
    transformRawValue,
    executeKEvent,
    K_EXECUTOR_CONSTANTS: () => ({ NOTIFICATION_GROUP_ID: 1, NOTIFICATION_PRIORITY_HIGHEST: 1, OBJECT_ID_USER: 0, EVENT_FLAG_GROUPID_IS_PRIORITY: 1 }),
    profileManager: {
      getActiveProfile: () => ({ name: 'Default', mappings: { xpndrSet: { event: 'XPNDR_SET', valueFormat: 'BCD_HEX' } } }),
      transformValue: transform
    },
    console: { warn: (...args) => calls.push(['warn', ...args]) },
    notifyDispatchFailure: (...args) => calls.push(['failure', ...args]),
    simConnectHandle: {
      mapClientEventToSimEvent: (...args) => calls.push(['map', ...args]),
      addClientEventToNotificationGroup() {},
      setNotificationGroupPriority() {},
      transmitClientEvent: (...args) => calls.push(['transmit', ...args])
    },
    isSimConnected: true,
    dynamicRegisteredEvents: new Map(),
    nextDynamicMappedId: 1,
    NOTIFICATION_GROUP_ID: 1,
    NOTIFICATION_PRIORITY_HIGHEST: 1,
    SimConnectConstants: { OBJECT_ID_USER: 0 },
    EventFlag: { EVENT_FLAG_GROUPID_IS_PRIORITY: 1 },
    bindingV2Diagnostics: { begin: () => () => {}, count() {} }
  };
  vm.createContext(context);
  vm.runInContext(dispatchText, context);
  vm.runInContext("dispatchSimEvent('xpndrSet', '0000')", context);
  vm.runInContext("dispatchSimEvent('xpndrSet', '0123')", context);
  assert.deepEqual(calls.filter((call) => call[0] === 'transmit').map((call) => call[3]), [0, 0x0123]);

  calls.length = 0;
  vm.runInContext("dispatchSimEvent('xpndrSet', '1280')", context);
  assert.equal(calls.some((call) => call[0] === 'transmit'), false);
  assert.equal(calls.some((call) => call[0] === 'failure' && /four octal digits/.test(call[2])), true);
});

test('W1-02: unit-bearing variable writes are typed and B: is explicitly unsupported', () => {
  const { parse } = extractedCurrentFunctions();
  assert.deepEqual(
    (({ kind, namespace, address, unit, value, hasValue }) => ({ kind, namespace, address, unit, value, hasValue }))(
      parse('4 (>A:TRANSPONDER STATE:1, Enum)')
    ),
    { kind: 'simvarset', namespace: 'A', address: 'TRANSPONDER STATE:1', unit: 'Enum', value: 4, hasValue: true }
  );
  assert.equal(parse('1 (>L:TEST, Number)').kind, 'lvarset');
  assert.equal(parse('1 (>B:TEST_Set)').status, 'unsupported');
});

test('CHARACTERIZATION defect W1-03/W1-04: raw K mismatch and mappings outlive replacement handle', () => {
  const dispatchText = server.slice(server.indexOf('function dispatchSimEvent('), server.indexOf('\n/**\n * Creates (idempotent'));
  const calls = [];
  const context = {
    PREFIXED_VAR_RE: /^[ALHK]:/i,
    resolveBindingTarget,
    compileKOperation,
    transformRawValue,
    executeKEvent,
    K_EXECUTOR_CONSTANTS: () => ({ NOTIFICATION_GROUP_ID: 1, NOTIFICATION_PRIORITY_HIGHEST: 1, OBJECT_ID_USER: 0, EVENT_FLAG_GROUPID_IS_PRIORITY: 1 }),
    profileManager: { getActiveProfile: () => ({ name: 'Test', mappings: {} }), transformValue: (_f, v) => v },
    console: { warn() {} }, notifyDispatchFailure: (...args) => calls.push(['failure', ...args]),
    simConnectHandle: { mapClientEventToSimEvent: (...a) => calls.push(['map', ...a]), addClientEventToNotificationGroup() {}, setNotificationGroupPriority() {}, transmitClientEvent: (...a) => calls.push(['transmit', ...a]) },
    isSimConnected: true, dynamicRegisteredEvents: new Map(), nextDynamicMappedId: 1,
    NOTIFICATION_GROUP_ID: 1, NOTIFICATION_PRIORITY_HIGHEST: 1,
    SimConnectConstants: { OBJECT_ID_USER: 0 }, EventFlag: { EVENT_FLAG_GROUPID_IS_PRIORITY: 1 }
  };
  context.bindingV2Diagnostics = { begin: () => () => {}, count() {} };
  vm.createContext(context); vm.runInContext(dispatchText, context);
  vm.runInContext("dispatchSimEvent('XPNDR_IDENT_ON', 1)", context);
  assert.equal(calls.at(-1)[0], 'failure');
  vm.runInContext("dispatchSimEvent('K:XPNDR_IDENT_ON', 1)", context);
  calls.length = 0; context.simConnectHandle = { ...context.simConnectHandle };
  vm.runInContext("dispatchSimEvent('K:XPNDR_IDENT_ON', 1)", context);
  assert.equal(calls.filter((c) => c[0] === 'map').length, 0);
  assert.equal(calls.filter((c) => c[0] === 'transmit').length, 1);
});

test('CHARACTERIZATION defect W1-05: decoder fields retain entries skipped during rebuild', () => {
  const body = server.slice(server.indexOf('function reapplyDynamicSimVars('), server.indexOf('\n/**\n * Live-applies'));
  assert.match(body, /const fields = chunkFieldsById\.get\(reqId\)/);
  assert.match(body, /if \(!source\) return/);
  assert.doesNotMatch(body, /chunkFieldsById\.set\(reqId,.*success/s);
});

test('CHARACTERIZATION defect W1-03/W1-06: calculator probe is single untagged pending slot', () => {
  assert.match(server, /let probeWritePending = null/);
  assert.match(server, /if \(probeWritePending\)[\s\S]*probeWritePending\.resolve/);
  assert.doesNotMatch(server, /probeWritePending\s*=\s*\{[^}]*requestId/);
});

test('CHARACTERIZATION defect W1-08: Studio manifest is empty and telemetry emits per field', () => {
  let updates = 0;
  const adapter = new StudioBridgeAdapter({ updateSimTelemetry() { updates++; } });
  assert.deepEqual(adapter.getActiveSchemaManifest(), { simVars: [], events: [] });
  adapter.ingestTelemetry({ a: 1, b: 2, c: 3 });
  assert.equal(updates, 3);
});

test('CHARACTERIZATION defect W1-08: each Studio telemetry notification is a Device View rebuild trigger', () => {
  const subscription = deviceView.slice(deviceView.indexOf('this.state.subscribe'), deviceView.indexOf('  initDOM()'));
  assert.match(subscription, /'SIM_TELEMETRY_UPDATED'/);
  assert.match(subscription, /this\.render\(\)/);
});

test('EXECUTABLE W1-05: skipped definition leaves decoder expecting an extra float64', () => {
  const definitionFields=[]; let decoder; const failures=[]; const updates=[];
  const context={
    chunkPeriodicActiveNormal:new Set(),chunkPeriodicActiveFast:new Set(),probeReadDefinitionExists:false,
    pendingFieldSends:new Map(),invalidSimVarBindings:new Map(),
    nextChunkIndex:{normal:1,fast:0},NORMAL_VAR_BASE_ID:1000,FAST_VAR_BASE_ID:5000,
    chunkFieldsById:new Map([[1000,['good','missing']]]),rawVarUnits:new Map(),
    resolveSimVarSource:name=>name==='missing'?null:{simVar:name,unit:'Number'},normalizeSimVarName:name=>name,
    SimConnectDataType:{FLOAT64:1},SimConnectConstants:{OBJECT_ID_USER:0},SimConnectPeriod:{SIM_FRAME:1},DataRequestFlag:{DATA_REQUEST_FLAG_CHANGED:1},
    seedChunkSnapshot(){}, BCD16_DECODE_KEYS:new Set(),ENUM_TO_BOOL_ACTIVE_KEYS:new Map(),
    updateSimVars:vars=>updates.push(vars), console:{error(){}},
    bindingV2Diagnostics:{enabled:false,begin:()=>()=>{},count:name=>failures.push(name)},
    handle:{addToDataDefinition:(_id,name)=>definitionFields.push(name),requestDataOnSimObject(){},on:(_event,callback)=>decoder=callback}
  };
  vm.createContext(context);
  const reapply=server.slice(server.indexOf('function reapplyDynamicSimVars('),server.indexOf('\n/**\n * Live-applies'));
  vm.runInContext(reapply+'\nreapplyDynamicSimVars(handle);',context);
  const start=server.indexOf("      handle.on('simObjectData', (recvSimObjectData) => {");
  const handler=server.slice(start,server.indexOf("      handle.on('exception'",start));
  vm.runInContext(handler,context);
  assert.deepEqual(definitionFields,['good']);
  const buffer=Buffer.alloc(8); buffer.writeDoubleLE(42); let offset=0;
  decoder({requestID:1000,data:{readFloat64(){const value=buffer.readDoubleLE(offset);offset+=8;return value;}}});
  assert.deepEqual(failures,['bridge.simulator.decoderFailures']);assert.equal(updates.length,0);
});
