export const commandBindings = {
  com1Swap: { adapter: 'simconnect-event', target: 'K:COM_STBY_RADIO_SWAP', valueSource: 'constant', constant: 0, parameterType: 'integer', encoding: 'unsigned-int', semantics: 'discrete' },
  com1StbySet: { adapter: 'simconnect-event', target: 'K:COM_STBY_RADIO_SET_HZ', valueSource: 'incoming', parameterType: 'number', logicalUnit: 'MHz', transportUnit: 'Hz', encoding: 'frequency', semantics: 'absolute-stream', bounds: { min: 118, max: 136.975 } },
  xpndrModeSet: { adapter: 'simconnect-data', target: 'A:TRANSPONDER STATE:1, Enum', valueSource: 'incoming', parameterType: 'enum', encoding: 'integer', semantics: 'absolute-stream', bounds: { min: 0, max: 5 } },
  xpndrCodeSet: { adapter: 'simconnect-event', target: 'K:XPNDR_SET', valueSource: 'incoming', parameterType: 'squawk', encoding: 'bcd-four-octal-digits', semantics: 'absolute-stream' },
  yokeElevatorAxis: { adapter: 'simconnect-event', target: 'K:AXIS_ELEVATOR_SET', valueSource: 'incoming', parameterType: 'integer', encoding: 'signed-int', semantics: 'absolute-stream', bounds: { min: -16383, max: 16383 } },
  yokeAileronAxis: { adapter: 'simconnect-event', target: 'K:AXIS_AILERONS_SET', valueSource: 'incoming', parameterType: 'integer', encoding: 'signed-int', semantics: 'absolute-stream', bounds: { min: -16383, max: 16383 } },
  syntheticInputEvent: { adapter: 'input-event', target: 'FIXTURE_ONLY_Do_Not_Use', valueSource: 'incoming', parameterType: 'number', encoding: 'float64', semantics: 'absolute-stream', fixtureOnly: true }
};

export const readFixtures = {
  zero: { packet: { sessionGeneration: 1, profileGeneration: 1, sequence: 1, values: { xpndrMode: 0 }, quality: { xpndrMode: { state: 'valid' } } } },
  unavailable: { packet: { sessionGeneration: 1, profileGeneration: 1, sequence: 2, values: {}, quality: { com1Stby: { state: 'unavailable', reason: 'source-not-exposed' } } } },
  text: { binding: { adapter: 'simconnect-data', source: 'A:TITLE', transportType: 'string256', transportUnit: 'String', logicalType: 'string', logicalUnit: 'text', delivery: 'background' }, value: 'Fixture Aircraft' },
  incompatibleUnits: {
    a: { adapter: 'simconnect-data', source: 'A:COM ACTIVE FREQUENCY:1', transportType: 'float64', transportUnit: 'MHz', logicalType: 'number', logicalUnit: 'MHz', delivery: 'responsive' },
    b: { adapter: 'simconnect-data', source: 'A:COM ACTIVE FREQUENCY:1', transportType: 'float64', transportUnit: 'Hz', logicalType: 'number', logicalUnit: 'MHz', delivery: 'responsive' }
  }
};
