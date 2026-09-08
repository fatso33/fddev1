/**
 * Wave 0 executable draft of Binding System 2.0 contracts.
 * Pure by design: no DOM, Electron, network, profile or simulator imports.
 */

export const WIRE_PROTOCOL_VERSION = '2.0-draft.0';
export const AIRCRAFT_PROFILE_SCHEMA_VERSION = '2.0-draft.0';
export const RESULT_STATES = Object.freeze([
  'submitted', 'rejected', 'acknowledged', 'observed', 'timeout-unknown'
]);

const DIRECTIONS = new Set(['read', 'write']);
const COMMAND_SEMANTICS = new Set(['discrete', 'relative', 'absolute-stream']);
const ADAPTERS = new Set(['simconnect-event', 'simconnect-data', 'input-event', 'wasm-calculator']);
const VALUE_SOURCES = new Set(['incoming', 'constant']);
const DATA_TYPES = new Set(['number', 'integer', 'string', 'boolean', 'enum', 'squawk']);
const DELIVERIES = new Set(['responsive', 'continuous', 'transition', 'background']);

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function text(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function integer(value, label, { min = 0 } = {}) {
  if (!Number.isSafeInteger(value) || value < min) throw new TypeError(`${label} must be a safe integer >= ${min}`);
  return value;
}

function finite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

export function validateDeckEvent(value) {
  const v = object(value, 'deckEvent');
  text(v.name, 'deckEvent.name');
  if (!DIRECTIONS.has(v.direction)) throw new TypeError('deckEvent.direction must be read or write');
  if (v.logicalType && !DATA_TYPES.has(v.logicalType)) throw new TypeError('deckEvent.logicalType is unsupported');
  return structuredClone(v);
}

export function validateCommandIntent(value) {
  const v = object(value, 'commandIntent');
  text(v.event, 'commandIntent.event');
  text(v.sourceId, 'commandIntent.sourceId');
  text(v.streamId, 'commandIntent.streamId');
  text(v.requestId, 'commandIntent.requestId');
  integer(v.sequence, 'commandIntent.sequence');
  integer(v.sessionGeneration, 'commandIntent.sessionGeneration');
  integer(v.profileGeneration, 'commandIntent.profileGeneration');
  if (!COMMAND_SEMANTICS.has(v.semantics)) throw new TypeError('commandIntent.semantics is unsupported');
  if (typeof v.value === 'number') finite(v.value, 'commandIntent.value');
  else if (typeof v.value !== 'string' && typeof v.value !== 'boolean') throw new TypeError('commandIntent.value must be finite, string or boolean');
  return structuredClone(v);
}

export function validateCommandBinding(value) {
  const v = object(value, 'commandBinding');
  if (!ADAPTERS.has(v.adapter)) throw new TypeError('commandBinding.adapter is unsupported');
  text(v.target, 'commandBinding.target');
  if (!VALUE_SOURCES.has(v.valueSource)) throw new TypeError('commandBinding.valueSource must be incoming or constant');
  if (!COMMAND_SEMANTICS.has(v.semantics)) throw new TypeError('commandBinding.semantics is unsupported');
  if (!DATA_TYPES.has(v.parameterType)) throw new TypeError('commandBinding.parameterType is unsupported');
  if (v.valueSource === 'constant' && v.constant === undefined) throw new TypeError('constant binding requires commandBinding.constant');

  if (v.bounds) {
    object(v.bounds, 'commandBinding.bounds');
    if (v.bounds.min !== undefined) finite(v.bounds.min, 'commandBinding.bounds.min');
    if (v.bounds.max !== undefined) finite(v.bounds.max, 'commandBinding.bounds.max');
    if (v.bounds.min !== undefined && v.bounds.max !== undefined && v.bounds.min > v.bounds.max) {
      throw new RangeError('commandBinding.bounds.min must not exceed max');
    }
  }
  if (v.valueSource === 'constant') validateBindingValue(v, v.constant);
  if (v.semantics === 'absolute-stream' && v.valueSource !== 'incoming') {
    throw new TypeError('absolute-stream bindings must use incoming values');
  }
  return structuredClone(v);
}

export function validateReadBinding(value) {
  const v = object(value, 'readBinding');
  if (!['simconnect-data', 'input-event', 'wasm-calculator'].includes(v.adapter)) throw new TypeError('readBinding.adapter is unsupported for reads');
  text(v.source, 'readBinding.source');
  if (!['float64', 'float32', 'int32', 'int64', 'string8', 'string32', 'string64', 'string128', 'string256', 'string260', 'stringv'].includes(v.transportType)) throw new TypeError('readBinding.transportType is unsupported');
  if (v.adapter === 'input-event' && !['float64', 'stringv'].includes(v.transportType)) throw new TypeError('Input Event transport must be float64 or stringv');
  if (!DATA_TYPES.has(v.logicalType)) throw new TypeError('readBinding.logicalType is unsupported');
  if (!DELIVERIES.has(v.delivery)) throw new TypeError('readBinding.delivery is unsupported');
  if (v.transportUnit !== undefined) text(v.transportUnit, 'readBinding.transportUnit');
  if (v.logicalUnit !== undefined) text(v.logicalUnit, 'readBinding.logicalUnit');
  return structuredClone(v);
}

export function sourceIdentity(readBinding) {
  const v = validateReadBinding(readBinding);
  return JSON.stringify([v.adapter, v.source, v.transportType, v.transportUnit || '']);
}

export function assertCompatibleReadRequests(a, b) {
  const left = validateReadBinding(a);
  const right = validateReadBinding(b);
  if (left.adapter !== right.adapter || left.source !== right.source ||
      left.transportType !== right.transportType || left.transportUnit !== right.transportUnit) {
    throw new TypeError('read requests require distinct source identities; transport units/types are incompatible');
  }
  return true;
}

export function validateStatePacket(value) {
  const v = object(value, 'statePacket');
  integer(v.sessionGeneration, 'statePacket.sessionGeneration');
  integer(v.profileGeneration, 'statePacket.profileGeneration');
  integer(v.sequence, 'statePacket.sequence');
  object(v.values, 'statePacket.values');
  object(v.quality, 'statePacket.quality');
  for (const [name, item] of Object.entries(v.values)) {
    if (!['number', 'string', 'boolean'].includes(typeof item) || (typeof item === 'number' && !Number.isFinite(item))) throw new TypeError(`statePacket.values.${name} must be a finite scalar`);
    if (!v.quality[name]) throw new TypeError(`statePacket.values.${name} requires quality`);
  }
  for (const [name, item] of Object.entries(v.quality)) {
    object(item, `statePacket.quality.${name}`);
    if (item.state === 'valid' && !Object.hasOwn(v.values, name)) throw new TypeError('valid quality requires a value');
    if (!['valid', 'unavailable', 'stale', 'unsupported'].includes(item.state)) {
      throw new TypeError(`statePacket.quality.${name}.state is unsupported`);
    }
  }
  return structuredClone(v);
}

export function encodeSquawk(value) {
  const digits = typeof value === 'number' && Number.isInteger(value)
    ? String(value).padStart(4, '0')
    : value;
  if (typeof digits !== 'string' || !/^[0-7]{4}$/.test(digits)) {
    throw new TypeError('squawk must be exactly four octal digits');
  }
  return Number.parseInt(digits, 16);
}

export function convertFrequency(value, fromUnit, toUnit) {
  finite(value, 'frequency');
  const scale = { Hz: 1, kHz: 1e3, MHz: 1e6 };
  if (!scale[fromUnit] || !scale[toUnit]) throw new TypeError('unsupported frequency unit');
  return value * scale[fromUnit] / scale[toUnit];
}

export function serializeInputEventId(value) {
  if (typeof value !== 'bigint' || value < 0n || value > 0xffffffffffffffffn) throw new TypeError('Input Event id must be a non-negative bigint');
  return value.toString(10);
}

export function parseInputEventId(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new TypeError('serialized Input Event id must be decimal text');
  const id = BigInt(value);
  serializeInputEventId(id);
  return id;
}

export function negotiateCapabilities(client, server) {
  object(client, 'clientCapabilities');
  object(server, 'serverCapabilities');
  const versions = (client.wireVersions || []).filter((v) => (server.wireVersions || []).includes(v));
  if (!versions.length) return { compatible: false, reason: 'unsupported-wire-version', operations: [] };
  const operations = (client.operations || []).filter((v) => (server.operations || []).includes(v));
  return { compatible: true, wireVersion: versions[0], operations };
}


/** Validate the resolved logical value, before any future transport encoding. */
export function validateBindingValue(binding, value) {
  const type = binding.parameterType;
  if (type === 'number') finite(value, 'binding value');
  else if (type === 'integer' || type === 'enum') {
    if (!Number.isSafeInteger(value)) throw new TypeError('binding value must be a safe integer');
  } else if (type === 'string') {
    if (typeof value !== 'string') throw new TypeError('binding value must be a string');
  } else if (type === 'boolean') {
    if (typeof value !== 'boolean') throw new TypeError('binding value must be boolean');
  } else if (type === 'squawk') encodeSquawk(value);
  else throw new TypeError('unsupported binding parameter type');
  if (binding.bounds) {
    finite(value, 'bounded binding value');
    if (value < (binding.bounds.min ?? -Infinity) || value > (binding.bounds.max ?? Infinity)) throw new RangeError('binding value outside bounds');
  }
  return value;
}
