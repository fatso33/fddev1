import test from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticsAccumulator } from '../../shared/diagnostics/Accumulator.js';
import { validateCommandBinding, validateReadBinding, validateStatePacket, parseInputEventId, serializeInputEventId, validateBindingValue } from '../../shared/binding-v2/contracts.js';
import { FakeClock } from './helpers/FakeClock.mjs';
import { FakeSimulatorSession } from './helpers/FakeSimulatorSession.mjs';
import { instrumentSocket } from '../../pc-bridge/diagnosticSocket.js';
import { SimBridge } from '../../flight-deck-pwa/js/core/SimBridge.js';
import { StudioSimVarTester } from '../../widget-studio/js/StudioSimVarTester.js';
import { StudioBridgeAdapter } from '../../widget-studio/js/StudioBridgeAdapter.js';

test('R1: early stalls survive bounded tail; reset excludes warmup and in-flight timers', () => {
  const clock = new FakeClock(); const d = new DiagnosticsAccumulator({enabled:true,clock:clock.now});
  for(let i=0;i<500;i++) d.sample('ms',1000);
  for(let i=0;i<500;i++) d.sample('ms',1);
  const m=d.snapshot().samples.ms;
  assert.equal(m.count,1000); assert.equal(m.max,1000); assert.equal(m.sum,500500);
  assert.equal(m.tail.max,1); assert.equal(m.boundedSamples.length,256);
  assert.ok(m.wholeCaptureQuantileRanges.p95[0] <= 1000 && m.wholeCaptureQuantileRanges.p95[1] >= 1000);
  assert.ok(m.histogram.buckets.length <= 2049);
  const finish=d.begin(); clock.advance(200); d.reset(); finish('old');
  assert.deepEqual(d.snapshot().samples,{}); assert.equal(d.snapshot().durationMs,0);
  d.sample('new',0); assert.equal(d.snapshot().samples.new.count,1);
});
test('R4: late reused request retains original generation, descriptors, and values', async () => {
  const clock=new FakeClock(); const sim=new FakeSimulatorSession({clock});
  sim.connect(); sim.define(1,['old']); const values={x:1};
  const old=sim.snapshot(1,values,{delay:20}); values.x=99;
  sim.reconnect(); assert.equal(sim.definitions.size,0); sim.define(1,['new']);
  const current=sim.snapshot(1,{x:2},{delay:1}); clock.advance(20);
  assert.equal((await old).generation,1); assert.deepEqual((await old).definition.fields,['old']);
  assert.equal((await old).values.x,1); assert.equal((await current).generation,2);
});
test('R5: exact invalid constants, read transports, state numbers and uint64 overflow rejected', () => {
  const b={adapter:'simconnect-event',target:'K:AP_MASTER',valueSource:'constant',constant:0,parameterType:'integer',semantics:'discrete'};
  for(const constant of [{x:1},0.5,NaN]) assert.throws(()=>validateCommandBinding({...b,constant}));
  assert.throws(()=>validateCommandBinding({...b,constant:500,bounds:{min:0,max:1}}));
  assert.throws(()=>validateReadBinding({adapter:'simconnect-event',source:'K:AP_MASTER',transportType:'nonsense',logicalType:'number',delivery:'responsive'}));
  assert.throws(()=>validateReadBinding({adapter:'simconnect-data',source:'A:TITLE',transportType:'nonsense',logicalType:'number',delivery:'responsive'}));
  assert.throws(()=>validateStatePacket({sessionGeneration:1,profileGeneration:1,sequence:1,values:{x:NaN},quality:{x:{state:'valid'}}}));
  assert.throws(()=>parseInputEventId('18446744073709551616'));
  assert.throws(()=>serializeInputEventId(18446744073709551616n));
  assert.equal(parseInputEventId('18446744073709551615'),18446744073709551615n);
  assert.throws(()=>validateBindingValue({...b,bounds:{min:0,max:1}},2));
  assert.equal(validateBindingValue(b,0),0);
});
test('R2: all socket send paths count actual recipients, bytes, and thrown sends correctly', () => {
  const d=new DiagnosticsAccumulator({enabled:true}); const sent=[];
  const socket={bufferedAmount:5,send(...args){sent.push(args);return 7;}};
  instrumentSocket(socket,d,1);
  assert.equal(socket.send('é'),7); socket.send('rpc');
  assert.equal(d.snapshot().counts['bridge.websocket.submittedBytes'],5);
  assert.equal(d.snapshot().counts['bridge.websocket.client.1.localSubmissions'],2);
  const failed={send(){throw new Error('closed');}}; instrumentSocket(failed,d,2);
  assert.throws(()=>failed.send('bad')); assert.equal(d.snapshot().counts['bridge.websocket.client.2.localSubmissions'],undefined);
  const disabled={send(){}}; const original=disabled.send;
  instrumentSocket(disabled,new DiagnosticsAccumulator(),3); assert.equal(disabled.send,original);
});
test('R2: real client sendRaw counts events only after open socket accepts send', () => {
  const previous=globalThis.WebSocket; globalThis.WebSocket={OPEN:1};
  try {
    const d=new DiagnosticsAccumulator({enabled:true}); const sent=[];
    const client={eventBus:{diagnostics:d},ws:{readyState:3,send(value){sent.push(value);}}};
    assert.equal(SimBridge.prototype.sendRaw.call(client,{type:'event',value:0}),false);
    assert.deepEqual(d.snapshot().counts,{});
    client.ws.readyState=1; assert.equal(SimBridge.prototype.sendRaw.call(client,{type:'event',value:0}),true);
    assert.equal(d.snapshot().counts['client.commands.localSubmissions'],1); assert.equal(sent.length,1);
  } finally { if(previous===undefined) delete globalThis.WebSocket; else globalThis.WebSocket=previous; }
});
test('R3: concurrent pending reads remain active after drawer close until individual settlement', async () => {
  const d=new DiagnosticsAccumulator({enabled:true}); const pending=[]; const result={};
  const tester=Object.create(StudioSimVarTester.prototype);
  Object.assign(tester,{_diagnosticActiveTests:new Set(),state:{diagnostics:d,testerParsed:{kind:'read',name:'A:TITLE'}},container:{querySelector:()=>result,classList:{add(){},remove(){}}},simBridge:{connected:true,probeReadSimVar:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))}});
  const first=tester.handleTest(), second=tester.handleTest();
  assert.equal(tester._diagnosticActiveTests.size,2); tester.close();
  assert.equal(tester._diagnosticActiveTests.size,2);
  assert.equal(d.snapshot().counts['studio.tests.cancellations'],undefined);
  pending[0].resolve(0); await first; assert.equal(tester._diagnosticActiveTests.size,1);
  pending[1].reject(new Error('disconnected')); await second; assert.equal(tester._diagnosticActiveTests.size,0);
  assert.equal(d.snapshot().counts['studio.tests.observations'],1);
  new StudioBridgeAdapter({updateSimTelemetry(){}},{diagnostics:d}).ingestTelemetry({x:5});
  assert.equal(d.snapshot().counts['studio.tests.observations'],1);
});

test('R3: diagnostic records end on disconnect or observed wiggle expiry without claiming cancellation', () => {
  const d=new DiagnosticsAccumulator({enabled:true}); const adapter=new StudioBridgeAdapter({},{diagnostics:d});
  const tester=Object.assign(Object.create(StudioSimVarTester.prototype),{state:{diagnostics:d},simBridge:{eventBus:adapter},_diagnosticActiveTests:new Set()});
  tester._attachDiagnosticLifecycle(); tester._diagnosticStart('read');
  adapter.publish('BRIDGE_STATUS',{connected:false});assert.equal(tester._diagnosticActiveTests.size,0);
  assert.equal(d.snapshot().counts['studio.tests.outcomeUnknownAfterDisconnect'],1);
  tester.wiggleSearching=true;tester._diagnosticWiggle=tester._diagnosticStart('wiggle');
  adapter.publish('BINDING_V2_WIGGLE_EXPIRED',{});assert.equal(tester._diagnosticActiveTests.size,0);
  assert.equal(d.snapshot().counts['studio.tests.wiggleExpiryObserved'],1);
  assert.equal(d.snapshot().counts['studio.tests.cancellations'],undefined);
});
