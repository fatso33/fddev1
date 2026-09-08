import { VirtualYokeEngine } from '../../../flight-deck-pwa/js/core/VirtualYokeEngine.js';
import { DiagnosticsAccumulator } from '../../../shared/diagnostics/Accumulator.js';
import { FakeClock } from './FakeClock.mjs';

/** Executes production orientation math, latest-value slot, deadband, and dispatch.
 * Only the candidate's test RAF scheduler differs; no transport/simulator is used. */
export function replayYoke(samples, { frameMs = 1000 / 60, phaseMs = 0, immediate = false, enabled = true } = {}) {
  const clock = new FakeClock();
  const saved = new Map(['performance','requestAnimationFrame','cancelAnimationFrame','window'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis,k)]));
  const commands = [];
  let sensorAt = null;
  const diagnostics = new DiagnosticsAccumulator({ enabled, clock: clock.now });
  const bus = { publish(type, payload) { if (type === 'SIM_EVENT_DISPATCH') commands.push({ ...payload, at: clock.now(), sensorAt, ageMs: clock.now() - sensorAt }); } };
  const install = (name, value) => Object.defineProperty(globalThis, name, { configurable:true, writable:true, value });
  try {
    install('performance', { now: clock.now });
    install('window', { screen: { orientation: { angle: 0 } }, addEventListener() {}, removeEventListener() {} });
    install('requestAnimationFrame', callback => {
      const at = phaseMs + (Math.floor((clock.now() - phaseMs) / frameMs) + 1) * frameMs;
      return clock.setTimeout(callback, immediate ? 0 : Math.max(0, at - clock.now()));
    });
    install('cancelAnimationFrame', clock.clear);
    const engine = new VirtualYokeEngine(bus, { diagnostics });
    engine.permissionState = 'granted'; engine.listening = true;
    engine.hasReference = true;
    engine._referenceMatrix = VirtualYokeEngine._buildRotationMatrix(0,0,0);
    for (const sample of samples) {
      clock.advance(sample.at - clock.now());
      if (sample.action === 'detach') engine.toggleAttach();
      else if (sample.action === 'stop') engine.stop();
      else if (sample.action === 'center') engine.center();
      else { sensorAt = sample.at; engine._onOrientation({ alpha: 0, beta: sample.beta ?? 0, gamma: sample.gamma ?? 0 }); }
      if (immediate) clock.advance(0);
    }
    clock.advance(frameMs * 2);
    return { commands, diagnostics: diagnostics.snapshot() };
  } finally {
    for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key]; }
  }
}
export function compareYokeReplay() {
  const samples = Array.from({ length:120 }, (_,i) => ({ at:i*1000/120, beta:20*Math.sin(i/15), gamma:25*Math.sin(i/19) }));
  return [0, 2, 5, 11].map(phaseMs => {
    const current = replayYoke(samples,{phaseMs});
    const candidate = replayYoke(samples,{phaseMs,immediate:true});
    const summarize = ({commands}) => ({ dispatches:commands.length, maxFreshSampleAgeMs:Math.max(...commands.map(c => c.ageMs)), meanFreshSampleAgeMs:commands.reduce((s,c)=>s+c.ageMs,0)/commands.length });
    return { phaseMs, current:summarize(current), immediateCandidate:summarize(candidate) };
  });
}
