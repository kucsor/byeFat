'use client';

export function triggerHapticFeedback() {
  if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
    // A short vibration for feedback on modern browsers
    window.navigator.vibrate(10);
  }
}
