import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parsePastedBinding, decidePaste } = require('../../pc-bridge/bindingPaste.cjs');
const read = (relative) => fs.readFileSync(new URL('../../' + relative, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('W1-02 parser preserves typed reads, indexed addresses, units, values and omission', () => {
  const aRead = parsePastedBinding('(A:TRANSPONDER STATE:1, Enum)');
  assert.equal(aRead.status, 'parsed');
  assert.deepEqual(
    { kind: aRead.kind, namespace: aRead.namespace, address: aRead.address, name: aRead.name, unit: aRead.unit, hasUnit: aRead.hasUnit },
    { kind: 'read', namespace: 'A', address: 'TRANSPONDER STATE:1', name: 'A:TRANSPONDER STATE:1', unit: 'Enum', hasUnit: true }
  );

  const lRead = parsePastedBinding('(l:TEST, Number)');
  assert.deepEqual(
    { namespace: lRead.namespace, name: lRead.name, unit: lRead.unit },
    { namespace: 'L', name: 'L:TEST', unit: 'Number' }
  );

  const explicitZero = parsePastedBinding('0 (>K:EXAMPLE)');
  const omitted = parsePastedBinding('(>K:EXAMPLE)');
  assert.equal(explicitZero.value, 0);
  assert.equal(explicitZero.hasValue, true);
  assert.equal(omitted.value, undefined);
  assert.equal(omitted.hasValue, false);

  const aWrite = parsePastedBinding('4 (>a:TRANSPONDER STATE:1, Enum)');
  assert.deepEqual(
    { kind: aWrite.kind, namespace: aWrite.namespace, address: aWrite.address, unit: aWrite.unit, event: aWrite.event, value: aWrite.value },
    { kind: 'simvarset', namespace: 'A', address: 'TRANSPONDER STATE:1', unit: 'Enum', event: 'A:TRANSPONDER STATE:1, Enum', value: 4 }
  );
  const lWrite = parsePastedBinding('1 (>L:TEST, Number)');
  assert.equal(lWrite.kind, 'lvarset');
  assert.equal(lWrite.event, 'L:TEST, Number');
});

test('W1-02 parser accepts only strict finite numeric literals and classifies unsupported syntax', () => {
  for (const literal of ['+1', '-0', '.5', '1.', '1e2', '-2.5E-2']) {
    const parsed = parsePastedBinding(`${literal} (>K:EXAMPLE)`);
    assert.equal(parsed.status, 'parsed', literal);
    assert.equal(parsed.hasValue, true, literal);
    assert.equal(Number.isFinite(parsed.value), true, literal);
  }
  for (const literal of ['NaN', 'Infinity', '-Infinity', '1.2.3', '--1', '1e309']) {
    const parsed = parsePastedBinding(`${literal} (>K:EXAMPLE)`);
    assert.equal(parsed.status, 'invalid', literal);
    assert.match(parsed.reason, /finite numeric literal/);
  }

  const inputEvent = parsePastedBinding('1 (>B:TEST_Set)');
  assert.equal(inputEvent.status, 'unsupported');
  assert.equal(inputEvent.namespace, 'B');
  assert.match(inputEvent.reason, /Input Events/);

  const unknown = parsePastedBinding('(X:SOMETHING, Number)');
  assert.equal(unknown.status, 'unsupported');
  assert.match(unknown.reason, /X: namespace/);

  const sequence = parsePastedBinding('1 (>K:ONE) 2 (>K:TWO)');
  assert.equal(sequence.status, 'test-only');
  assert.match(sequence.reason, /cannot be stored/);
});

test('W1-02 paste conversion is lossless for representable rows and blocks other constants', () => {
  const editableWrite = { kind: 'write', editable: true, valueFormat: 'RAW_INT' };

  assert.deepEqual(decidePaste(parsePastedBinding('0 (>K:EXAMPLE)'), editableWrite).changes, {
    event: 'K:EXAMPLE', valueFormat: 'FIXED_0'
  });
  assert.deepEqual(decidePaste(parsePastedBinding('1 (>L:TEST, Number)'), editableWrite).changes, {
    event: 'L:TEST, Number', valueFormat: 'FIXED_1'
  });
  assert.deepEqual(decidePaste(parsePastedBinding('0 (>L:TEST, Number)'), editableWrite).changes, {
    event: 'L:TEST, Number', valueFormat: 'FIXED_0'
  });

  const four = decidePaste(parsePastedBinding('4 (>A:TRANSPONDER STATE:1, Enum)'), editableWrite);
  assert.equal(four.ok, false);
  assert.match(four.reason, /cannot be stored/);

  const valuedHEvent = decidePaste(parsePastedBinding('1 (>H:TEST)'), editableWrite);
  assert.equal(valuedHEvent.ok, false);
  assert.match(valuedHEvent.reason, /without a parameter/);

  const valuelessK = decidePaste(parsePastedBinding('(>K:COM1_RADIO_SWAP)'), { ...editableWrite, valueFormat: 'FIXED_0' });
  assert.equal(valuelessK.ok, true);
  assert.deepEqual(valuelessK.changes, { event: 'K:COM1_RADIO_SWAP' });
  assert.match(valuelessK.note, /keeps its current FIXED_0 format/);

  const valuelessH = decidePaste(parsePastedBinding('(>H:AS1000_PFD_SOFTKEY_1)'), editableWrite);
  assert.equal(valuelessH.ok, true);
  assert.equal(Object.hasOwn(valuelessH.changes, 'valueFormat'), false);

  const valuelessL = decidePaste(parsePastedBinding('(>L:TEST)'), editableWrite);
  assert.equal(valuelessL.ok, false);
  assert.match(valuelessL.reason, /need a value/);
});

test('W1-02 paste conversion validates row shape, editability and read units', () => {
  const read = parsePastedBinding('(A:TRANSPONDER STATE:1, Enum)');
  assert.deepEqual(decidePaste(read, { kind: 'read', editable: true, unitEditable: true }).changes, {
    address: 'A:TRANSPONDER STATE:1', unit: 'Enum'
  });
  assert.equal(decidePaste(read, { kind: 'write', editable: true }).ok, false);
  assert.equal(decidePaste(parsePastedBinding('0 (>K:EXAMPLE)'), { kind: 'read', editable: true }).ok, false);
  assert.equal(decidePaste(read, { kind: 'read', editable: false }).ok, false);
  assert.equal(decidePaste(read, { kind: 'read', editable: true, unit: 'Bool', unitEditable: false }).ok, false);
  assert.equal(decidePaste(parsePastedBinding('0 (>K:EXAMPLE)'), {
    kind: 'write', editable: true, valueFormat: 'RAW_INT', formatEditable: false
  }).ok, false);
});

test('W1-02 configuration script remains syntactically valid after loading the pure module', () => {
  const html = read('pc-bridge/config-ui.html');
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script));
});

function makeUiFixture() {
  const html = read('pc-bridge/config-ui.html');
  const start = html.indexOf('    function pasteEligibility');
  const end = html.indexOf('    // ── 1.1-B wiggle-to-find', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const elements = {
    'tester-input': { value: '' },
    'tester-result': { textContent: '' },
    'tester-test-btn': { disabled: true },
    'event-writeRow': { value: 'OLD_EVENT', readOnly: false },
    'ns-writeRow': { value: '', disabled: false },
    'format-writeRow': { value: 'RAW_INT', disabled: false },
    'simvar-readRow': { value: 'OLD_READ', readOnly: false },
    'ns-readRow': { value: '', disabled: false },
    'unit-readRow': { value: 'OldUnit', readOnly: false }
  };
  const pasteButtons = [
    { dataset: { key: 'writeRow', kind: 'write' }, disabled: false, title: '' },
    { dataset: { key: 'readRow', kind: 'read' }, disabled: false, title: '' }
  ];
  const context = {
    parsePastedBinding,
    decidePaste,
    Object,
    document: {
      getElementById: (id) => elements[id] || null,
      querySelectorAll: (selector) => selector === '.paste-btn' ? pasteButtons : []
    },
    setAddressField(key, kind, stored) {
      const prefix = String(stored).match(/^([ALHK]):(.*)$/i);
      const ns = prefix ? prefix[1].toUpperCase() : '';
      elements[`ns-${key}`].value = kind === 'write' && ns !== 'K' ? `${ns}:` : kind === 'read' && ns === 'L' ? 'L:' : '';
      elements[`${kind === 'read' ? 'simvar' : 'event'}-${key}`].value = prefix ? prefix[2] : stored;
    },
    markDirty() { context.dirty = true; },
    labelFor: (key) => key,
    rowIsOverridden: () => false,
    baseRow: () => null,
    dirty: false
  };
  vm.createContext(context);
  vm.runInContext(`let lastParsed = null;\n${html.slice(start, end)}\nthis.ui = { handleTesterParse, handleRowPaste, updatePasteButtons };`, context);
  return { context, elements, pasteButtons, ui: context.ui };
}

test('W1-02 actual UI handlers disable incompatible Paste and leave rejected rows unchanged', () => {
  const { context, elements, pasteButtons, ui } = makeUiFixture();
  const writeButton = pasteButtons[0];

  elements['tester-input'].value = '4 (>A:TRANSPONDER STATE:1, Enum)';
  ui.handleTesterParse();
  assert.equal(elements['tester-test-btn'].disabled, false, 'a valid but unpersistable expression remains testable');
  assert.equal(writeButton.disabled, true);
  assert.match(writeButton.title, /cannot be stored/);

  const before = {
    event: elements['event-writeRow'].value,
    namespace: elements['ns-writeRow'].value,
    format: elements['format-writeRow'].value
  };
  ui.handleRowPaste(writeButton);
  assert.deepEqual({
    event: elements['event-writeRow'].value,
    namespace: elements['ns-writeRow'].value,
    format: elements['format-writeRow'].value
  }, before);
  assert.equal(context.dirty, false);
  assert.match(elements['tester-result'].textContent, /row was not changed/);

  elements['tester-input'].value = '(A:TRANSPONDER STATE:1, Enum)';
  ui.handleTesterParse();
  assert.equal(writeButton.disabled, true);
  assert.match(writeButton.title, /read expression/);
  ui.handleRowPaste(writeButton);
  assert.deepEqual({
    event: elements['event-writeRow'].value,
    namespace: elements['ns-writeRow'].value,
    format: elements['format-writeRow'].value
  }, before);
  assert.equal(context.dirty, false);

  elements['tester-input'].value = '1 (>B:TEST_Set)';
  ui.handleTesterParse();
  assert.equal(elements['tester-test-btn'].disabled, true);
  assert.equal(writeButton.disabled, true);
  assert.match(writeButton.title, /Input Events/);
});

test('W1-02 actual UI paste handler writes A/L unit and fixed value format together', () => {
  const { context, elements, pasteButtons, ui } = makeUiFixture();
  const writeButton = pasteButtons[0];

  elements['tester-input'].value = '0 (>L:TEST, Number)';
  ui.handleTesterParse();
  assert.equal(writeButton.disabled, false);
  ui.handleRowPaste(writeButton);

  assert.equal(elements['ns-writeRow'].value, 'L:');
  assert.equal(elements['event-writeRow'].value, 'TEST, Number');
  assert.equal(elements['format-writeRow'].value, 'FIXED_0');
  assert.equal(context.dirty, true);

  const aFixture = makeUiFixture();
  aFixture.elements['tester-input'].value = '1 (>A:TRANSPONDER STATE:1, Enum)';
  aFixture.ui.handleTesterParse();
  aFixture.ui.handleRowPaste(aFixture.pasteButtons[0]);
  assert.equal(aFixture.elements['ns-writeRow'].value, 'A:');
  assert.equal(aFixture.elements['event-writeRow'].value, 'TRANSPONDER STATE:1, Enum');
  assert.equal(aFixture.elements['format-writeRow'].value, 'FIXED_1');
});

test('W1-02 profile disk round trip retains supported addresses, units and constants', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'flightdeck-wave1b-'));
  const previousStorage = process.env.PORTABLE_EXECUTABLE_DIR;
  process.env.PORTABLE_EXECUTABLE_DIR = tempRoot;
  try {
    const { ProfileManager } = await import(`../../pc-bridge/profileManager.js?wave1b=${Date.now()}`);
    const manager = new ProfileManager();
    const base = manager.getActiveProfile();
    const mappings = structuredClone(base.mappings);
    const simVars = structuredClone(base.simVars);
    mappings.wave1bKZero = { event: 'EXAMPLE', valueFormat: 'FIXED_0', userEdited: true };
    mappings.wave1bLUnit = { event: 'L:TEST, Number', valueFormat: 'FIXED_1', userEdited: true };
    simVars.wave1bRead = { simVar: 'A:TRANSPONDER STATE:1', unit: 'Enum', userEdited: true };
    manager.saveProfile({ id: 'wave1b-roundtrip', name: 'Wave 1B', mappings, simVars });

    const reloaded = new ProfileManager();
    assert.equal(reloaded.setActiveProfile('wave1b-roundtrip'), true);
    const profile = reloaded.getActiveProfile();
    assert.deepEqual(profile.mappings.wave1bKZero, mappings.wave1bKZero);
    assert.deepEqual(profile.mappings.wave1bLUnit, mappings.wave1bLUnit);
    assert.deepEqual(profile.simVars.wave1bRead, simVars.wave1bRead);
  } finally {
    if (previousStorage === undefined) delete process.env.PORTABLE_EXECUTABLE_DIR;
    else process.env.PORTABLE_EXECUTABLE_DIR = previousStorage;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
