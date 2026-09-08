import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

// Wave 1C review correction #4: actual config-ui.html UI-handler fixtures for
// handleRowTest() and the structured tester branch inside handleTesterTest().
// Syntax-only compilation (the existing W1-02 "configuration script remains
// syntactically valid" check) does not exercise these functions' actual
// behavior — this file does, using the same "extract the real source into a
// vm context with fake DOM/IPC" technique parser-and-paste.test.mjs already
// established for handleRowPaste()/updatePasteButtons().

const require = createRequire(import.meta.url);
const { parsePastedBinding, decidePaste } = require('../../pc-bridge/bindingPaste.cjs');
const read = (relative) => fs.readFileSync(new URL('../../' + relative, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

function makeUiFixture() {
  const html = read('pc-bridge/config-ui.html');
  const start = html.indexOf('    function escapeHtml(str) {');
  // Stop before the top-level `document.addEventListener('click', ...)`
  // wiring block — unlike everything else in this range it executes
  // immediately at script-eval time (not on demand), and this fixture's
  // minimal `document` stub has no addEventListener.
  const end = html.indexOf("    document.addEventListener('click'");
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const elements = {
    'tester-input': { value: '' },
    'tester-result': { textContent: '' },
    'tester-test-btn': { disabled: true },
    // WRITE_NAMESPACES's K: option is value '' (the implied/no-prefix
    // default — see splitNamespace()/joinNamespace() in the real source),
    // so a genuine K row's address input holds the bare event name with no
    // "K:" text at all. readAddressField() reproduces exactly what the real
    // structured address editor would hand back for such a row.
    'event-kRow': { value: 'XPNDR_SET', readOnly: false },
    'ns-kRow': { value: '', disabled: false },
    'format-kRow': { value: 'BCD_HEX', disabled: false },
    'row-test-result-kRow': { textContent: '' },
    // WRITE_NAMESPACES has no "B:" entry at all, so an unsupported-namespace
    // row (e.g. imported/legacy data) surfaces with the ns-<key> dropdown
    // stuck on its K: default while the address input carries the full,
    // unstripped "B:TEST_Set" text — exactly root's repro shape.
    'event-bRow': { value: 'B:TEST_Set', readOnly: false },
    'ns-bRow': { value: '', disabled: false },
    'format-bRow': { value: 'RAW_INT', disabled: false },
    'row-test-result-bRow': { textContent: '' }
  };

  const ipcCalls = [];
  const ipcResponses = {};
  const promptCalls = [];
  const promptResponses = [];

  const context = {
    parsePastedBinding,
    decidePaste,
    Object,
    isDirty: false,
    document: {
      getElementById: (id) => elements[id] || null,
      querySelectorAll: (selector) => (selector === '.paste-btn' || selector === '.reset-btn' ? [] : [])
    },
    // The real handleRowTest()/handleTesterTest() call the bare global
    // `prompt(...)` — the same standard window.prompt() Electron's renderer
    // already exposes and that handleAddVariable() (shipped, unrelated code)
    // already relies on. This stub honors that exact contract (a string, or
    // null on Cancel) rather than a custom dialog API, so a passing test
    // here demonstrates the source calls the real browser mechanism, not
    // merely that *some* function named `prompt` was invoked.
    prompt: (message) => {
      promptCalls.push(message);
      return promptResponses.length ? promptResponses.shift() : null;
    },
    ipcRenderer: {
      invoke: async (channel, payload) => {
        ipcCalls.push([channel, payload]);
        const responder = ipcResponses[channel];
        if (responder) return responder(payload);
        return { ok: false, reason: `no mock response configured for ${channel}` };
      }
    },
    markDirty() { context.isDirty = true; },
    labelFor: (key) => key,
    rowIsOverridden: () => false,
    baseRow: () => null
  };
  vm.createContext(context);
  // The slice (starting at escapeHtml, well before line ~845's own
  // `let lastParsed = null;`) already declares lastParsed itself — unlike
  // parser-and-paste.test.mjs's fixture, which starts its slice AFTER that
  // declaration and so has to supply its own. Prepending one here would
  // throw "Identifier 'lastParsed' has already been declared".
  vm.runInContext(
    `${html.slice(start, end)}\nthis.ui = { handleTesterParse, handleTesterTest, handleRowTest };`,
    context
  );
  return { context, elements, ipcCalls, ipcResponses, promptCalls, promptResponses, ui: context.ui };
}

// ---- handleRowTest() ----------------------------------------------------

test('W1C CORRECTION UI FIXTURE handleRowTest: a B: row (no local fast-path for it, unlike H:/L:/A:) is still rejected — by the shared backend boundary — with no dirty-state mutation', async () => {
  const { context, elements, ipcCalls, ipcResponses, promptResponses, ui } = makeUiFixture();
  // handleRowTest()'s client-side fast path only special-cases H:/L:/A:
  // (adapters this row test explicitly does not cover yet); an
  // unsupported/unknown namespace like B: is intentionally left to the
  // shared kBindingCompiler.cjs boundary via the IPC round trip — this
  // fixture proves that boundary is what actually stops it, not a false
  // sense of client-side coverage.
  promptResponses.push('1');
  ipcResponses['test-k-row-event'] = (payload) => {
    // deepEqual on a vm-realm object literal reports "same structure but not
    // reference-equal" against an outer-realm literal — compare fields
    // individually instead (payload crosses the vm context boundary).
    assert.equal(payload.eventTarget, 'B:TEST_Set');
    assert.equal(payload.valueFormat, 'RAW_INT');
    assert.equal(payload.rawValue, '1');
    return { ok: false, code: 'unsupported-namespace', reason: '"B:" is not a supported namespace for a K binding.' };
  };
  await ui.handleRowTest('bRow');
  assert.equal(ipcCalls.length, 1);
  assert.match(elements['row-test-result-bRow'].textContent, /not a supported namespace/);
  assert.equal(context.isDirty, false);
});

test('W1C CORRECTION UI FIXTURE handleRowTest: cancelling the prompt performs no test and calls no IPC', async () => {
  const { context, elements, ipcCalls, promptCalls, ui } = makeUiFixture();
  // promptResponses stays empty -> the stub returns null, i.e. Cancel.
  await ui.handleRowTest('kRow');
  assert.equal(promptCalls.length, 1, 'the real prompt() must have been invoked exactly once');
  assert.match(elements['row-test-result-kRow'].textContent, /cancelled/i);
  assert.equal(ipcCalls.length, 0);
  assert.equal(context.isDirty, false);
});

test('W1C CORRECTION UI FIXTURE handleRowTest: an empty-string sample is rejected locally, not sent as a submission', async () => {
  const { elements, ipcCalls, promptResponses, ui } = makeUiFixture();
  promptResponses.push('   ');
  await ui.handleRowTest('kRow');
  assert.match(elements['row-test-result-kRow'].textContent, /sample value is required/);
  assert.equal(ipcCalls.length, 0);
});

test('W1C CORRECTION UI FIXTURE handleRowTest: a valid squawk sample submits via test-k-row-event and preserves the leading zero in the rendered value', async () => {
  const { elements, ipcCalls, ipcResponses, promptResponses, ui } = makeUiFixture();
  promptResponses.push('0123');
  ipcResponses['test-k-row-event'] = (payload) => {
    assert.equal(payload.eventTarget, 'XPNDR_SET');
    assert.equal(payload.valueFormat, 'BCD_HEX');
    assert.equal(payload.rawValue, '0123');
    return { ok: true, submitted: true, eventName: 'XPNDR_SET', value: 0x0123, mappedId: 8000 };
  };
  await ui.handleRowTest('kRow');
  assert.equal(ipcCalls.length, 1);
  assert.equal(ipcCalls[0][0], 'test-k-row-event');
  assert.match(elements['row-test-result-kRow'].textContent, /XPNDR_SET = 291/);
  assert.match(elements['row-test-result-kRow'].textContent, /Not saved, pinned, or applied/);
});

test('W1C CORRECTION UI FIXTURE handleRowTest renders a backend rejection (e.g. B:/malformed target the client-side check missed) as the returned reason', async () => {
  const { elements, ipcResponses, promptResponses, ui } = makeUiFixture();
  promptResponses.push('1');
  ipcResponses['test-k-row-event'] = () => ({ ok: false, code: 'invalid-target', reason: 'The K: target has no event name.' });
  await ui.handleRowTest('kRow');
  assert.match(elements['row-test-result-kRow'].textContent, /The K: target has no event name\./);
});

// ---- handleTesterTest()'s structured K branch ----------------------------

test('W1C CORRECTION UI FIXTURE tester Test: an explicit representable K constant (0) submits directly via test-structured-k-event with no prompt', async () => {
  const { context, elements, ipcCalls, ipcResponses, promptCalls, ui } = makeUiFixture();
  ipcResponses['test-structured-k-event'] = (payload) => {
    assert.equal(payload.actionName, 'K:COM1_RADIO_SWAP');
    assert.equal(payload.rawValue, 0);
    return { ok: true, submitted: true, eventName: 'COM1_RADIO_SWAP', value: 0, mappedId: 9000 };
  };
  elements['tester-input'].value = '0 (>K:COM1_RADIO_SWAP)';
  context.ui.handleTesterParse();
  await ui.handleTesterTest();
  assert.equal(promptCalls.length, 0, 'a representable explicit constant needs no sample prompt');
  assert.equal(ipcCalls.length, 1);
  assert.equal(ipcCalls[0][0], 'test-structured-k-event');
  assert.match(elements['tester-result'].textContent, /COM1_RADIO_SWAP = 0/);
});

test('W1C CORRECTION UI FIXTURE tester Test: an omitted K parameter prompts for an explicit sample instead of silently testing as zero', async () => {
  const { context, elements, ipcCalls, ipcResponses, promptCalls, promptResponses, ui } = makeUiFixture();
  ipcResponses['test-structured-k-event'] = (payload) => {
    assert.equal(payload.actionName, 'K:COM1_RADIO_SWAP');
    assert.equal(payload.rawValue, '1');
    return { ok: true, submitted: true, eventName: 'COM1_RADIO_SWAP', value: 1, mappedId: 9001 };
  };
  promptResponses.push('1');
  elements['tester-input'].value = '(>K:COM1_RADIO_SWAP)';
  context.ui.handleTesterParse();
  await ui.handleTesterTest();
  assert.equal(promptCalls.length, 1);
  assert.equal(ipcCalls.length, 1);
  assert.equal(ipcCalls[0][0], 'test-structured-k-event');
  assert.match(elements['tester-result'].textContent, /COM1_RADIO_SWAP = 1/);
});

test('W1C CORRECTION UI FIXTURE tester Test: cancelling the omitted-parameter prompt performs no test — no silent omission-to-zero', async () => {
  const { context, elements, ipcCalls, promptCalls, ui } = makeUiFixture();
  // promptResponses stays empty -> Cancel.
  elements['tester-input'].value = '(>K:COM1_RADIO_SWAP)';
  context.ui.handleTesterParse();
  await ui.handleTesterTest();
  assert.equal(promptCalls.length, 1);
  assert.equal(ipcCalls.length, 0, 'cancelling must never fall back to submitting 0');
  assert.match(elements['tester-result'].textContent, /cancelled/i);
});

test('W1C CORRECTION UI FIXTURE tester Test: an empty-string sample for an omitted K parameter is rejected locally', async () => {
  const { context, elements, ipcCalls, promptResponses, ui } = makeUiFixture();
  promptResponses.push('');
  elements['tester-input'].value = '(>K:COM1_RADIO_SWAP)';
  context.ui.handleTesterParse();
  await ui.handleTesterTest();
  assert.equal(ipcCalls.length, 0);
  assert.match(elements['tester-result'].textContent, /sample value is required/);
});

test('W1C CORRECTION UI FIXTURE tester Test: a non-representable K constant and an H: write still fall through to the calculator-code path, not the shared executor', async () => {
  const { context, elements, ipcCalls, ipcResponses, ui } = makeUiFixture();
  ipcResponses['get-hevent-shim-status'] = () => ({ installs: [], channelReady: false });

  elements['tester-input'].value = '4 (>K:XPNDR_SET)';
  context.ui.handleTesterParse();
  await ui.handleTesterTest();
  assert.ok(ipcCalls.some((c) => c[0] === 'get-hevent-shim-status'), 'a non-representable K constant must still use the legacy calculator-code path');
  assert.equal(ipcCalls.some((c) => c[0] === 'test-structured-k-event'), false);

  ipcCalls.length = 0;
  elements['tester-input'].value = '1 (>H:AS1000_PFD_SOFTKEY_1)';
  context.ui.handleTesterParse();
  await ui.handleTesterTest();
  assert.ok(ipcCalls.some((c) => c[0] === 'get-hevent-shim-status'), 'an H: write must still use the legacy calculator-code path');
  assert.equal(ipcCalls.some((c) => c[0] === 'test-structured-k-event'), false);
});

test('W1C CORRECTION UI FIXTURE: none of the new Test paths mutate dirty state', async () => {
  const { context, elements, ipcResponses, promptResponses, ui } = makeUiFixture();
  ipcResponses['test-k-row-event'] = () => ({ ok: true, submitted: true, eventName: 'XPNDR_SET', value: 0, mappedId: 1 });
  ipcResponses['test-structured-k-event'] = () => ({ ok: true, submitted: true, eventName: 'COM1_RADIO_SWAP', value: 0, mappedId: 1 });

  promptResponses.push('0000');
  await ui.handleRowTest('kRow');
  assert.equal(context.isDirty, false);

  elements['tester-input'].value = '0 (>K:COM1_RADIO_SWAP)';
  context.ui.handleTesterParse();
  await ui.handleTesterTest();
  assert.equal(context.isDirty, false);
});
