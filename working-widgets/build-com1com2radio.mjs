// One-off generator script for com.flightdeck.com1com2radio.fdwidget.
// Run with: node build-com1com2radio.mjs
// Kept alongside the output so the widget's structure/layout math is easy
// to re-derive or tweak without hand-editing deeply-nested JSON by hand.
import fs from 'fs';

const widget = {
  fdws: '1.1',
  schemaVersion: '1.1.0',
  id: 'com.flightdeck.com1com2radio',
  revision: 2,
  kind: 'widget',
  meta: {
    name: 'COM 1/2 Radio (Collapsible)',
    shortName: 'COM1/2',
    author: 'Flight Deck Avionics',
    description:
      'COM 1 active/standby radio with swap and 4 quick-frequency presets, exactly as the default COM Radios widget. A small toggle in the header shows/hides a COM 2 section in place of the presets — COM 2 stays live in the background even while hidden, so its frequencies are never stale when revealed. Working draft — not yet in garmin-widgets/.',
    category: 'Avionics',
    tags: ['radio', 'com', 'com1', 'com2', 'avionics', 'presets', 'frequency', 'collapsible'],
    license: 'CC-BY-4.0'
  },
  layout: {
    // Page-grid footprint (in the app's own placement grid, now 20x44
    // portrait / 44x20 landscape — see CHANGELOG "Doubled compact page grid
    // resolution"). Doubled in lockstep so this widget keeps the same
    // relative on-screen size/proportions it always had.
    defaultW: 20,
    defaultH: 10,
    minW: 12,
    minH: 8,
    maxW: 44,
    maxH: 44,
    resizable: true,
    // Widget's own internal component-authoring grid — independent of the
    // page grid above, unaffected by the doubling.
    grid: { columns: 24, rows: 11 }
  },
  layerGroups: [
    { id: 'background', z: 0, locked: true },
    { id: 'panels', z: 10 },
    { id: 'controls', z: 50 }
  ],
  state: [
    { name: 'com1ActFreq', type: 'string', default: '122.800', syncFrom: 'com1ActFreq' },
    { name: 'com1StbyFreq', type: 'string', default: '121.500', syncFrom: 'com1StbyFreq' },
    // Kept synced even while the COM 2 section is hidden (visibleWhen only
    // gates rendering, not the subscription — see CompositeWidget.js's
    // registerDynamicBindings()), so revealing it never shows a stale value.
    { name: 'com2ActFreq', type: 'string', default: '118.700', syncFrom: 'com2ActFreq' },
    { name: 'com2StbyFreq', type: 'string', default: '119.100', syncFrom: 'com2StbyFreq' },
    { name: 'presets', type: 'array', default: ['---', '---', '---', '---'] },
    // Local-only UI state — no syncFrom, never touches SimConnect. persist:true
    // so a placed instance remembers whether COM 2 was left shown or hidden
    // across app reloads, same as any other per-instance widget setting.
    { name: 'com2Visible', type: 'boolean', default: false, persist: true }
  ],
  components: [
    {
      id: 'bg_bezel',
      type: 'core.label',
      layout: { col: 1, row: 1, w: 24, h: 11 },
      layer: { group: 'background', z: 0, pointerEvents: 'none' },
      props: { text: '' },
      style: {
        background: { type: 'color', color: '#0c1017' },
        border: { width: 1, color: '#1e293b', radius: 10 }
      }
    },

    // --- Header row: COM1 tag, title, COM2 show/hide toggle ---
    {
      id: 'lbl_com1_tag',
      type: 'core.label',
      layout: { col: 2, row: 1, w: 5, h: 1 },
      layer: { group: 'panels', z: 10, pointerEvents: 'none' },
      props: { text: 'COM 1', align: 'left' },
      style: { typography: { font: 'Chakra Petch', size: 11, weight: 700, color: '#94a3b8' } }
    },
    {
      id: 'lbl_title',
      type: 'core.label',
      layout: { col: 7, row: 1, w: 8, h: 1 },
      layer: { group: 'panels', z: 10, pointerEvents: 'none' },
      props: { text: 'COM 1/2 RADIOS', align: 'center' },
      style: { typography: { font: 'Chakra Petch', size: 12, weight: 800, color: '#cbd5e1' } }
    },
    {
      id: 'btn_toggle_com2',
      type: 'core.button',
      layout: { col: 16, row: 1, w: 8, h: 1 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      // FDWS v1.1 variant:"toggle" — ButtonComponent.js lights the button
      // (cyan glow + LED) whenever the bound value is truthy, so this one
      // button visually communicates "COM 2 shown" without needing two
      // mutually-exclusive labeled buttons.
      binding: { stateVar: 'com2Visible' },
      props: { variant: 'toggle', label: 'COM 2', hasLed: true },
      style: {
        background: { type: 'color', color: '#111827' },
        border: { width: 1, color: '#1f293d', radius: 6 },
        typography: { font: 'Chakra Petch', size: 10, weight: 700, color: '#94a3b8' }
      },
      interactions: [{ trigger: 'tap', action: { type: 'core.toggleLocalState', field: 'com2Visible' } }]
    },

    // --- COM 1 section (identical to the default COM Radios widget) ---
    {
      id: 'box_com1',
      type: 'core.label',
      layout: { col: 2, row: 2, w: 22, h: 4 },
      layer: { group: 'panels', z: 10, pointerEvents: 'none' },
      props: { text: '' },
      style: {
        background: { type: 'color', color: '#080c14' },
        border: { width: 1, color: '#1e293b', radius: 8 }
      }
    },
    {
      id: 'lbl_com1_act',
      type: 'core.label',
      layout: { col: 3, row: 2, w: 8, h: 1 },
      layer: { group: 'controls', z: 20, pointerEvents: 'none' },
      props: { text: 'ACTIVE', align: 'center' },
      style: { typography: { font: 'Chakra Petch', size: 10, weight: 700, color: '#64748b' } }
    },
    {
      id: 'disp_com1_act',
      type: 'core.display',
      layout: { col: 3, row: 3, w: 8, h: 2 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      binding: { readSimVar: 'com1ActFreq', stateVar: 'com1ActFreq' },
      props: { format: 'FREQ_COM', prefix: '' },
      style: {
        background: { type: 'none' },
        border: { width: 0, color: 'transparent' },
        typography: { font: 'Chakra Petch', size: 19, weight: 800, color: '#22c55e' }
      }
    },
    {
      id: 'btn_com1_swap',
      type: 'core.button',
      layout: { col: 11, row: 3, w: 3, h: 2 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      props: { variant: 'swap', icon: 'swap' },
      style: {
        background: { type: 'color', color: '#111827' },
        border: { width: 1, color: '#1f293d', radius: 6 }
      },
      interactions: [
        { trigger: 'tap', action: { type: 'core.swapLocalState', fields: ['com1ActFreq', 'com1StbyFreq'] } },
        { trigger: 'tap', action: { type: 'core.dispatchEvent', event: 'com1Swap', value: 0 } }
      ]
    },
    {
      id: 'lbl_com1_stby',
      type: 'core.label',
      layout: { col: 14, row: 2, w: 9, h: 1 },
      layer: { group: 'controls', z: 20, pointerEvents: 'none' },
      props: { text: 'STBY', align: 'center' },
      style: { typography: { font: 'Chakra Petch', size: 10, weight: 700, color: '#64748b' } }
    },
    {
      id: 'input_com1_stby',
      type: 'core.input',
      layout: { col: 14, row: 3, w: 9, h: 2 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      binding: { readSimVar: 'com1StbyFreq', writeEvent: 'com1StbySet', stateVar: 'com1StbyFreq' },
      props: { format: 'FREQ_COM', min: 118, max: 136.975, placeholder: '121.500', defaultValue: '121.500' },
      style: {
        background: { type: 'color', color: '#06090f' },
        border: { width: 1, color: '#1e293b', radius: 6 },
        typography: { font: 'Chakra Petch', size: 18, weight: 700, color: '#f8fafc' }
      }
    },

    // --- Shared area (rows 6-10): COM 2 section XOR presets, same grid
    //     footprint, gated by com2Visible so exactly one renders at a time ---

    // COM 2 section (visible when com2Visible === true)
    {
      id: 'lbl_com2_tag',
      type: 'core.label',
      layout: { col: 2, row: 6, w: 5, h: 1 },
      layer: { group: 'panels', z: 10, pointerEvents: 'none' },
      visibleWhen: { state: 'com2Visible', equals: true },
      props: { text: 'COM 2', align: 'left' },
      style: { typography: { font: 'Chakra Petch', size: 11, weight: 700, color: '#94a3b8' } }
    },
    {
      id: 'box_com2',
      type: 'core.label',
      layout: { col: 2, row: 7, w: 22, h: 4 },
      layer: { group: 'panels', z: 10, pointerEvents: 'none' },
      visibleWhen: { state: 'com2Visible', equals: true },
      props: { text: '' },
      style: {
        background: { type: 'color', color: '#080c14' },
        border: { width: 1, color: '#1e293b', radius: 8 }
      }
    },
    {
      id: 'lbl_com2_act',
      type: 'core.label',
      layout: { col: 3, row: 7, w: 8, h: 1 },
      layer: { group: 'controls', z: 20, pointerEvents: 'none' },
      visibleWhen: { state: 'com2Visible', equals: true },
      props: { text: 'ACTIVE', align: 'center' },
      style: { typography: { font: 'Chakra Petch', size: 10, weight: 700, color: '#64748b' } }
    },
    {
      id: 'disp_com2_act',
      type: 'core.display',
      layout: { col: 3, row: 8, w: 8, h: 2 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      visibleWhen: { state: 'com2Visible', equals: true },
      binding: { readSimVar: 'com2ActFreq', stateVar: 'com2ActFreq' },
      props: { format: 'FREQ_COM', prefix: '' },
      style: {
        background: { type: 'none' },
        border: { width: 0, color: 'transparent' },
        typography: { font: 'Chakra Petch', size: 19, weight: 800, color: '#22c55e' }
      }
    },
    {
      id: 'btn_com2_swap',
      type: 'core.button',
      layout: { col: 11, row: 8, w: 3, h: 2 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      visibleWhen: { state: 'com2Visible', equals: true },
      props: { variant: 'swap', icon: 'swap' },
      style: {
        background: { type: 'color', color: '#111827' },
        border: { width: 1, color: '#1f293d', radius: 6 }
      },
      interactions: [
        { trigger: 'tap', action: { type: 'core.swapLocalState', fields: ['com2ActFreq', 'com2StbyFreq'] } },
        { trigger: 'tap', action: { type: 'core.dispatchEvent', event: 'com2Swap', value: 0 } }
      ]
    },
    {
      id: 'lbl_com2_stby',
      type: 'core.label',
      layout: { col: 14, row: 7, w: 9, h: 1 },
      layer: { group: 'controls', z: 20, pointerEvents: 'none' },
      visibleWhen: { state: 'com2Visible', equals: true },
      props: { text: 'STBY', align: 'center' },
      style: { typography: { font: 'Chakra Petch', size: 10, weight: 700, color: '#64748b' } }
    },
    {
      id: 'input_com2_stby',
      type: 'core.input',
      layout: { col: 14, row: 8, w: 9, h: 2 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      visibleWhen: { state: 'com2Visible', equals: true },
      binding: { readSimVar: 'com2StbyFreq', writeEvent: 'com2StbySet', stateVar: 'com2StbyFreq' },
      props: { format: 'FREQ_COM', min: 118, max: 136.975, placeholder: '119.100', defaultValue: '119.100' },
      style: {
        background: { type: 'color', color: '#06090f' },
        border: { width: 1, color: '#1e293b', radius: 6 },
        typography: { font: 'Chakra Petch', size: 18, weight: 700, color: '#f8fafc' }
      }
    },

    // Presets section (visible when com2Visible === false) — same footprint
    // as the COM 2 section above; presets apply to COM 1's standby field,
    // matching the default COM Radios widget's own preset behavior exactly.
    {
      id: 'lbl_presets_tag',
      type: 'core.label',
      layout: { col: 2, row: 6, w: 12, h: 1 },
      layer: { group: 'panels', z: 10, pointerEvents: 'none' },
      visibleWhen: { state: 'com2Visible', equals: false },
      props: { text: 'COM 1 PRESETS', align: 'left' },
      style: { typography: { font: 'Chakra Petch', size: 11, weight: 700, color: '#94a3b8' } }
    },
    {
      id: 'box_presets',
      type: 'core.label',
      layout: { col: 2, row: 7, w: 22, h: 4 },
      layer: { group: 'panels', z: 10, pointerEvents: 'none' },
      visibleWhen: { state: 'com2Visible', equals: false },
      props: { text: '' },
      style: {
        background: { type: 'color', color: '#080c14' },
        border: { width: 1, color: '#1e293b', radius: 8 }
      }
    },
    {
      id: 'btn_preset_1',
      type: 'core.button',
      layout: { col: 3, row: 7, w: 9, h: 2 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      visibleWhen: { state: 'com2Visible', equals: false },
      binding: { stateVar: 'presets' },
      props: { variant: 'preset', label: '---', presetSlot: 0 },
      style: {
        background: { type: 'color', color: '#090d14' },
        border: { width: 1, color: '#1e293b', radius: 6 },
        typography: { font: 'Chakra Petch', size: 14, weight: 700, color: '#f8fafc' }
      },
      interactions: [
        { trigger: 'tap', action: { type: 'core.applyPresetToField', field: 'com1StbyFreq', presetSlot: 0 } },
        { trigger: 'longpress', action: { type: 'core.editPreset', presetSlot: 0, field: 'com1StbyFreq' } }
      ]
    },
    {
      id: 'btn_preset_2',
      type: 'core.button',
      layout: { col: 13, row: 7, w: 9, h: 2 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      visibleWhen: { state: 'com2Visible', equals: false },
      binding: { stateVar: 'presets' },
      props: { variant: 'preset', label: '---', presetSlot: 1 },
      style: {
        background: { type: 'color', color: '#090d14' },
        border: { width: 1, color: '#1e293b', radius: 6 },
        typography: { font: 'Chakra Petch', size: 14, weight: 700, color: '#f8fafc' }
      },
      interactions: [
        { trigger: 'tap', action: { type: 'core.applyPresetToField', field: 'com1StbyFreq', presetSlot: 1 } },
        { trigger: 'longpress', action: { type: 'core.editPreset', presetSlot: 1, field: 'com1StbyFreq' } }
      ]
    },
    {
      id: 'btn_preset_3',
      type: 'core.button',
      layout: { col: 3, row: 9, w: 9, h: 2 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      visibleWhen: { state: 'com2Visible', equals: false },
      binding: { stateVar: 'presets' },
      props: { variant: 'preset', label: '---', presetSlot: 2 },
      style: {
        background: { type: 'color', color: '#090d14' },
        border: { width: 1, color: '#1e293b', radius: 6 },
        typography: { font: 'Chakra Petch', size: 14, weight: 700, color: '#f8fafc' }
      },
      interactions: [
        { trigger: 'tap', action: { type: 'core.applyPresetToField', field: 'com1StbyFreq', presetSlot: 2 } },
        { trigger: 'longpress', action: { type: 'core.editPreset', presetSlot: 2, field: 'com1StbyFreq' } }
      ]
    },
    {
      id: 'btn_preset_4',
      type: 'core.button',
      layout: { col: 13, row: 9, w: 9, h: 2 },
      layer: { group: 'controls', z: 50, pointerEvents: 'auto' },
      visibleWhen: { state: 'com2Visible', equals: false },
      binding: { stateVar: 'presets' },
      props: { variant: 'preset', label: '---', presetSlot: 3 },
      style: {
        background: { type: 'color', color: '#090d14' },
        border: { width: 1, color: '#1e293b', radius: 6 },
        typography: { font: 'Chakra Petch', size: 14, weight: 700, color: '#f8fafc' }
      },
      interactions: [
        { trigger: 'tap', action: { type: 'core.applyPresetToField', field: 'com1StbyFreq', presetSlot: 3 } },
        { trigger: 'longpress', action: { type: 'core.editPreset', presetSlot: 3, field: 'com1StbyFreq' } }
      ]
    }
  ],
  capabilities: {
    readSimVars: ['com1ActFreq', 'com1StbyFreq', 'com2ActFreq', 'com2StbyFreq'],
    writeEvents: ['com1Swap', 'com1StbySet', 'com2Swap', 'com2StbySet']
  },
  updatedAt: Date.now()
};

fs.writeFileSync('com_flightdeck_com1com2radio.fdwidget', JSON.stringify(widget, null, 2) + '\n', 'utf8');
console.log('Wrote com_flightdeck_com1com2radio.fdwidget');
