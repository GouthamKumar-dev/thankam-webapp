let audioContext: AudioContext | null = null;

function fallbackBeep() {
  if (typeof window === 'undefined') return;
  const Context =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Context) return;
  audioContext = audioContext ?? new Context();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.12);
}

export async function playNotificationSound(
  type: 'admin' | 'customer' = 'admin',
) {
  if (typeof window === 'undefined') return;
  const fileName =
    type === 'admin' ? 'admin-notification.mp3' : 'customer-notification.mp3';
  const audio = new Audio(`/audio/${fileName}`);
  audio.volume = 0.65;

  try {
    await audio.play();
  } catch {
    fallbackBeep();
  }
}

