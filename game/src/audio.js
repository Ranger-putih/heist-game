// The Quiet Vault — procedural sound, no audio files.
// A low tense drone under everything, a rising blip while the alarm climbs,
// a soft chime for loot and a harsh sting for getting caught. Everything is
// synthesised with WebAudio so the game ships no sound files at all.

export function createVaultAudio() {
  let context = null;
  let droneOsc = null;
  let droneGain = null;
  let alarmOsc = null;
  let alarmGain = null;
  let started = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      context = new AudioContextClass();
    } catch {
      return false;
    }
    // The drone: two detuned low oscillators through a slow filter.
    droneOsc = context.createOscillator();
    droneOsc.type = 'sawtooth';
    droneOsc.frequency.value = 55;
    const droneOsc2 = context.createOscillator();
    droneOsc2.type = 'sine';
    droneOsc2.frequency.value = 55.7;
    droneGain = context.createGain();
    droneGain.gain.value = 0.035;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    droneOsc.connect(filter);
    droneOsc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(context.destination);
    droneOsc.start();
    droneOsc2.start();
    // The alarm blip, silent until the tension rises.
    alarmOsc = context.createOscillator();
    alarmOsc.type = 'square';
    alarmOsc.frequency.value = 880;
    alarmGain = context.createGain();
    alarmGain.gain.value = 0;
    alarmOsc.connect(alarmGain);
    alarmGain.connect(context.destination);
    alarmOsc.start();
    started = true;
    return true;
  }

  function blip(frequency, duration, volume, type = 'sine') {
    if (!context) return;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + duration);
  }

  return {
    // Call on the first click or key press: browsers only allow audio after
    // a user gesture.
    unlock() {
      ensure();
    },
    started() {
      return started;
    },
    // 0 = calm, 1 = the alarm is about to blow: the drone thickens and the
    // blip starts ticking.
    setTension(level) {
      if (!context) return;
      const clamped = Math.max(0, Math.min(1, level));
      droneGain.gain.setTargetAtTime(0.035 + clamped * 0.05, context.currentTime, 0.4);
      alarmGain.gain.setTargetAtTime(clamped > 0.25 ? 0.012 + clamped * 0.02 : 0, context.currentTime, 0.2);
      alarmOsc.frequency.setTargetAtTime(620 + clamped * 420, context.currentTime, 0.3);
    },
    pickup() {
      blip(660, 0.18, 0.12);
      setTimeout(() => blip(990, 0.22, 0.12), 90);
    },
    noiseThrow() {
      blip(320, 0.12, 0.1, 'triangle');
    },
    emp() {
      blip(180, 0.5, 0.14, 'sawtooth');
      setTimeout(() => blip(90, 0.6, 0.12, 'sawtooth'), 120);
    },
    caught() {
      blip(220, 0.7, 0.2, 'sawtooth');
      setTimeout(() => blip(110, 0.9, 0.2, 'sawtooth'), 200);
    },
    getaway() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => blip(freq, 0.3, 0.12), i * 130);
      });
    },
  };
}
