let audioContext: AudioContext | null = null;

export function playUiSound(type: 'click' | 'success' = 'click') {
  if (typeof window === 'undefined') return;

  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(type === 'success' ? 660 : 520, now);
    oscillator.frequency.exponentialRampToValueAtTime(type === 'success' ? 880 : 620, now + 0.07);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(type === 'success' ? 0.035 : 0.018, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'success' ? 0.14 : 0.08));

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + (type === 'success' ? 0.15 : 0.09));
  } catch {
    // Audio is an enhancement only; never block product interactions.
  }
}
