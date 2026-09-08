import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { collectInventory } from '../../pc-bridge/tools/input-event-inventory.mjs';
import { FakeClock } from './helpers/FakeClock.mjs';
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
function fixture(connectOverride) {
  const clock=new FakeClock(), handle=new EventEmitter(); let closed=0;
  Object.assign(handle,{close(){closed++;},addToDataDefinition(){},requestDataOnSimObject(){},enumerateInputEvents(){},enumerateInputEventParams(){}});
  const connect=connectOverride || (()=>({handle,recvOpen:{applicationName:'fixture',applicationVersionMajor:1,applicationVersionMinor:2,applicationBuildMajor:3,applicationBuildMinor:4}}));
  const promise=collectInventory({connect,types:{STRING256:1},periods:{ONCE:1},timeoutMs:10,setTimer:clock.setTimeout,clearTimer:clock.clear});
  const aircraft=()=>{const values=['C172 fixture','model'];handle.emit('simObjectData',{requestID:0x464431,data:{readString256:()=>values.shift()}});};
  const page=(entryNumber,outOf=2)=>handle.emit('inputEventsList',{requestID:0x464430,entryNumber,outOf,inputEventDescriptors:[{name:'event'+entryNumber,inputEventIdHash:BigInt(entryNumber+1),type:0}]});
  const params=id=>handle.emit('enumerateInputEventParams',{inputEventIdHash:BigInt(id),value:'value'});
  return {clock,handle,promise,aircraft,page,params,closed:()=>closed};
}
test('R6: out-of-order pages require every page and parameters plus aircraft metadata', async()=>{
  const f=fixture();await flush();f.aircraft();f.page(1);f.params(2);f.page(1);f.page(0);f.params(1);
  const r=await f.promise;assert.equal(r.complete,true);assert.equal(r.count,2);assert.deepEqual(r.pagesReceived,[0,1]);assert.equal(r.simulator.applicationVersion,'1.2.3.4');assert.equal(r.aircraft.title,'C172 fixture');assert.equal(f.closed(),1);
});
test('R6: missing earlier page cannot masquerade as complete last-page success', async()=>{
  const f=fixture();await flush();f.aircraft();f.page(1);f.params(2);f.clock.advance(10);
  const r=await f.promise;assert.equal(r.status,'timeout');assert.equal(r.complete,false);assert.deepEqual(r.pagesReceived,[1]);
});
test('R6: missing params and parameter exceptions produce incomplete evidence', async()=>{
  const f=fixture();await flush();f.aircraft();f.page(0,1);f.clock.advance(10);
  assert.deepEqual((await f.promise).pendingParameterIds,['1']);
  const g=fixture();await flush();g.page(0,1);g.handle.emit('exception',{exception:'parameter error'});
  assert.equal((await g.promise).status,'error');assert.equal((await g.promise).errors.length,1);
});
test('R6: connection timeout is bounded and a late connection is closed', async()=>{
  let resolve;const f=fixture(()=>new Promise(r=>resolve=r));await flush();f.clock.advance(10);
  assert.equal((await f.promise).status,'timeout');resolve({handle:f.handle,recvOpen:{}});await flush();assert.equal(f.closed(),1);
});
test('R6: rejected connection and early disconnection fail explicitly', async()=>{
  const f=fixture(()=>Promise.reject(new Error('not running')));assert.equal((await f.promise).status,'error');
  const g=fixture();await flush();g.handle.emit('close');assert.equal((await g.promise).status,'disconnected');
});
