import test from 'node:test';
import assert from 'node:assert/strict';
import { replayYoke, compareYokeReplay } from './helpers/YokeReplay.mjs';
test('production yoke: phased replay compares actual coalescing with isolated immediate candidate', () => {
  for (const run of compareYokeReplay()) {
    assert.ok(run.current.maxFreshSampleAgeMs <= 1000/60 + 0.01);
    assert.equal(run.immediateCandidate.maxFreshSampleAgeMs, 0);
    assert.ok(run.immediateCandidate.dispatches > run.current.dispatches);
  }
});
test('production yoke: latest value, deadband, zero, center and disabled diagnostics preserve commands', () => {
  const samples = [{at:0,beta:10},{at:2,beta:20},{at:20,beta:20},{at:40,beta:0},{at:60,beta:10},{at:80,action:'center'},{at:90,beta:10}];
  const on = replayYoke(samples), off = replayYoke(samples,{enabled:false});
  assert.deepEqual(on.commands, off.commands);
  assert.equal(on.commands[0].sensorAt,2);
  assert.ok(on.commands.some(c => c.event === 'yokeElevatorAxis' && c.value === 0));
  assert.ok(on.diagnostics.counts['pwa.yoke.deadbandSuppressions'] > 0);
});
test('production yoke: stop cancels pending frame and detached samples do not enqueue', () => {
  assert.equal(replayYoke([{at:0,beta:20},{at:1,action:'stop'}]).commands.length,0);
  assert.equal(replayYoke([{at:0,action:'detach'},{at:1,beta:20}]).commands.length,0);
});
