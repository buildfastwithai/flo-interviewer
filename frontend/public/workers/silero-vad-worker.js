// Minimal placeholder worker that simulates VAD interface.
// Replace with actual Silero VAD WASM/JS integration when available.

let lastTimestamp = 0;

self.onmessage = (event) => {
  const data = event.data || {};
  if (data.command === 'process') {
    const ts = data.timestamp || Date.now();
    // Naive periodic speech/silence toggling for UI responsiveness
    const period = 1200; // ms
    const phase = (ts % (period * 2)) < period;
    const isSpeech = phase;
    const confidence = isSpeech ? 0.7 : 0.4;
    lastTimestamp = ts;
    self.postMessage({ isSpeech, confidence, timestamp: ts });
  }
};


