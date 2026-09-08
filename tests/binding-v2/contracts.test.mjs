import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WIRE_PROTOCOL_VERSION, validateCommandBinding, validateCommandIntent, validateReadBinding,
  validateStatePacket, encodeSquawk, convertFrequency, serializeInputEventId, parseInputEventId,
  assertCompatibleReadRequests, negotiateCapabilities
} from '../../shared/binding-v2/contracts.js';
import { commandBindings, readFixtures } from './fixtures/contracts.mjs';

test('proposed contract: illustrative command fixtures preserve semantics', () => {
  for (const binding of Object.values(commandBindings)) validateCommandBinding(binding);
  assert.equal(commandBindings.xpndrModeSet.valueSource, 'incoming');
  assert.equal(commandBindings.xpndrModeSet.adapter, 'simconnect-data');
  assert.equal(commandBindings.xpndrModeSet.target, 'A:TRANSPONDER STATE:1, Enum');
  assert.deepEqual(commandBindings.xpndrModeSet.bounds, { min: 0, max: 5 });
  assert.equal(commandBindings.yokeElevatorAxis.semantics, 'absolute-stream');
  assert.equal(commandBindings.syntheticInputEvent.fixtureOnly, true);
});

test('proposed contract: valid zero and four-digit squawk survive', () => {
  assert.equal(encodeSquawk('0000'), 0);
  assert.equal(encodeSquawk('0123'), 0x123);
  assert.throws(() => encodeSquawk('1280'), /four octal digits/);
  assert.deepEqual(validateStatePacket(readFixtures.zero.packet).values, { xpndrMode: 0 });
});

test('proposed contract: unavailable is quality, not a fabricated value', () => {
  const packet = validateStatePacket(readFixtures.unavailable.packet);
  assert.equal('com1Stby' in packet.values, false);
  assert.equal(packet.quality.com1Stby.state, 'unavailable');
});

test('proposed contract: non-finite values and constant absolute streams are rejected', () => {
  assert.throws(() => validateCommandIntent({ event: 'x', value: NaN, sourceId: 's', streamId: 'x', sequence: 0, requestId: 'r', sessionGeneration: 1, profileGeneration: 1, semantics: 'discrete' }), /finite/);
  assert.throws(() => validateCommandBinding({ adapter: 'simconnect-event', target: 'K:X', valueSource: 'constant', constant: 1, parameterType: 'integer', semantics: 'absolute-stream' }), /incoming/);
});

test('proposed contract: frequency conversion is explicit', () => {
  assert.equal(convertFrequency(118.5, 'MHz', 'Hz'), 118500000);
  assert.throws(() => convertFrequency(1, 'knots', 'Hz'), /unsupported/);
});

test('proposed contract: incompatible transport units require distinct sources', () => {
  validateReadBinding(readFixtures.text.binding);
  assert.throws(() => assertCompatibleReadRequests(readFixtures.incompatibleUnits.a, readFixtures.incompatibleUnits.b), /incompatible/);
});

test('proposed contract: Input Event ids round-trip outside JS safe integer range', () => {
  const hash = 11675888408130357189n;
  assert.equal(parseInputEventId(serializeInputEventId(hash)), hash);
});

test('proposed contract: additive capability negotiation does not mutate current traffic', () => {
  const result = negotiateCapabilities(
    { wireVersions: [WIRE_PROTOCOL_VERSION, '1.x'], operations: ['legacy-state', 'input-event'] },
    { wireVersions: [WIRE_PROTOCOL_VERSION], operations: ['legacy-state'] }
  );
  assert.deepEqual(result, { compatible: true, wireVersion: WIRE_PROTOCOL_VERSION, operations: ['legacy-state'] });
  assert.equal(negotiateCapabilities({ wireVersions: ['1'] }, { wireVersions: ['2'] }).compatible, false);
});
