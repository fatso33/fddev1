import test from 'node:test';
import assert from 'node:assert/strict';
import { extractWidgetVariables, extractBindingRows } from '../../shared/widgetVarExtractor.js';
import { dependencyWidget } from './fixtures/dependency-widget.mjs';

test('dependency fixture: canonical extractor covers nested/list/actions/zones/state/capabilities', () => {
  const result = extractWidgetVariables(dependencyWidget);
  assert.deepEqual(new Set(result.reads), new Set(['directRead', 'stateSyncRead', 'manifestRead']));
  assert.deepEqual(new Set(result.writes), new Set(['directWrite', 'ackWrite', 'nestedAction', 'rockerUp', 'rockerDown', 'manifestWrite']));
  assert.equal(extractBindingRows(dependencyWidget).length, 6, 'rows are declaration sites; capability-only names have no editable component site');
});

test('dependency fixture documents runtime-only gaps rather than inventing instances', () => {
  const result = extractWidgetVariables(dependencyWidget);
  assert.equal(result.reads.includes('fixture.referenced.component'), false, 'core.ref requires host/library resolution');
  assert.equal(result.reads.includes('fixture.popover'), false, 'popover dependencies require open runtime instance');
});
