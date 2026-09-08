export const dependencyWidget = {
  id: 'fixture.binding-v2.dependencies',
  components: [
    { id: 'direct', type: 'core.display', binding: { readSimVar: 'directRead', writeEvent: 'directWrite', ackEvent: 'ackWrite' } },
    { id: 'container', type: 'core.container', components: [
      { id: 'nested', type: 'core.button', interactions: [{ trigger: 'tap', action: { type: 'core.dispatchEvent', event: 'nestedAction' } }] }
    ] },
    { id: 'list', type: 'core.list', itemTemplate: { components: [
      { id: 'repeat', type: 'core.rocker', props: { zones: [{ writeEvent: 'rockerUp' }, { writeEvent: 'rockerDown' }] } }
    ] } },
    { id: 'ref', type: 'core.ref', props: { libraryId: 'fixture.referenced.component' } },
    { id: 'popover', type: 'core.button', interactions: [{ trigger: 'tap', action: { type: 'core.openWidgetPopover', popoverWidgetId: 'fixture.popover' } }] }
  ],
  state: [{ name: 'synced', type: 'number', syncFrom: 'stateSyncRead' }],
  capabilities: { readSimVars: ['manifestRead'], writeEvents: ['manifestWrite'] }
};

