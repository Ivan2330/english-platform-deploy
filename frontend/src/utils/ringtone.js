// Простий рингтон на Web Audio API — без аудіо-файлів.
// Класичний телефонний тон 440+480 Гц: ~1с дзвінок, пауза, повтор.

let ctx = null;
let intervalId = null;

function playRingCycle() {
  if (!ctx) return;
  const now = ctx.currentTime;
  [440, 480].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
    gain.gain.setValueAtTime(0.12, now + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.05);
  });
}

export function startRingtone() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    playRingCycle();
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(playRingCycle, 3000);
  } catch (e) {
    // Якщо аудіо недоступне — UI вхідного дзвінка все одно показується
    console.warn('Ringtone unavailable:', e);
  }
}

export function stopRingtone() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}