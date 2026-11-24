const timings = {
  strike: [115, 52, '#fff2c6'],
  enemy: [225, 45, '#ff9d80'],
  arrow: [250, 30, '#ffc47f'],
  bolt: [95, 76, '#a5ffd8'],
  hound: [172, 67, '#ffb277'],
  ward: [190, 62, '#d5baff'],
  heal: [105, 32, '#8ef5bd'],
};

export const impactLength = 760;
const clamp = value => Math.max(0, Math.min(1, value));

export function impactStyle(effect) {
  const [contact, hold, color] = timings[effect.kind];
  return {
    contact, hold, color: effect.hit ? color : '#c2c5e5',
    power: effect.defeated || effect.fallen ? 1.35
      : effect.kind === 'bolt' || effect.kind === 'hound' || effect.kind === 'ward' ? 1.15 : .76,
  };
}

export function impactFrame(effect, elapsed, still) {
  const { contact, hold, color, power } = impactStyle(effect);
  const age = elapsed - (still ? 0 : contact);
  const windup = clamp(elapsed / contact);
  const recovery = clamp((age - hold) / 260);
  return {
    age, color, power,
    travel: still ? 1 : windup ** 2,
    reach: still ? 0 : windup ** 3 * (1 - recovery) ** 2,
    recoil: still || age < 0 ? 0 : (1 - recovery) ** 3 * power,
  };
}

export function setupHitSound(button) {
  let context;
  let output;
  let noise;
  let enabled = false;

  button.addEventListener('click', async () => {
    enabled = !enabled;
    button.textContent = enabled ? 'Sound on' : 'Sound off';
    button.setAttribute('aria-pressed', String(enabled));
    if (!enabled) {
      if (output) output.gain.value = 0;
      return;
    }
    try {
      const Audio = window.AudioContext ?? window.webkitAudioContext;
      if (!context) {
        context = new Audio();
        output = context.createGain();
        output.connect(context.destination);
        noise = context.createBuffer(1, Math.floor(context.sampleRate * .125), context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      output.gain.value = .21;
      await context.resume();
    } catch {
      enabled = false;
      button.textContent = 'Sound off';
      button.setAttribute('aria-pressed', 'false');
    }
  });

  return effects => {
    if (!enabled || context?.state !== 'running') return;
    const effect = effects.find(item => item.defeated || item.fallen)
      ?? effects.find(item => item.kind === 'hound' || item.kind === 'bolt' || item.kind === 'ward')
      ?? effects[0];
    if (!effect) return;
    const { contact } = impactStyle(effect);
    const start = context.currentTime + contact / 1000;
    const magic = ['bolt', 'heal', 'ward'].includes(effect.kind);
    const heavy = effect.defeated || effect.fallen || effect.kind === 'hound';
    const oscillator = context.createOscillator();
    const tone = context.createGain();
    oscillator.type = magic ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(magic ? 370 : heavy ? 135 : 195, start);
    oscillator.frequency.exponentialRampToValueAtTime(magic ? 710 : 52, start + .12);
    tone.gain.setValueAtTime(.001, start);
    tone.gain.exponentialRampToValueAtTime(heavy ? .44 : .25, start + .012);
    tone.gain.exponentialRampToValueAtTime(.001, start + .145);
    oscillator.connect(tone).connect(output);
    oscillator.start(start);
    oscillator.stop(start + .15);
    if (!magic) {
      const burst = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const volume = context.createGain();
      filter.type = 'lowpass';
      filter.frequency.value = heavy ? 800 : 1900;
      volume.gain.setValueAtTime(heavy ? .42 : .28, start);
      volume.gain.exponentialRampToValueAtTime(.001, start + .115);
      burst.buffer = noise;
      burst.connect(filter).connect(volume).connect(output);
      burst.start(start);
    }
  };
}
