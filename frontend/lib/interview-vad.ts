export type InterviewVADOptions = {
  vadThreshold?: number;
  minSpeechDuration?: number; // ms
  minSilenceDuration?: number; // ms
};

export class InterviewVAD {
  vadThreshold: number;
  minSpeechDuration: number;
  minSilenceDuration: number;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadWorker: Worker | null = null;
  private isListening = false;
  private isSpeaking = false;
  private silenceStart: number | null = null;
  private speechStart: number | null = null;

  onSpeechStart?: (ts: number) => void;
  onSpeechEnd?: (ts: number) => void;

  constructor(options: InterviewVADOptions = {}) {
    this.vadThreshold = options.vadThreshold ?? 0.6;
    this.minSpeechDuration = options.minSpeechDuration ?? 300;
    this.minSilenceDuration = options.minSilenceDuration ?? 800;
  }

  async initialize(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.3;
    this.vadWorker = new Worker('/workers/silero-vad-worker.js');
    this.vadWorker.onmessage = (event: MessageEvent) => this.handleVADResult(event.data);
    return true;
  }

  async startListening(stream: MediaStream) {
    if (!this.audioContext || !this.analyser) return;
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    this.isListening = true;
    this.processAudio();
  }

  stop() {
    this.isListening = false;
    this.isSpeaking = false;
    this.silenceStart = null;
    this.speechStart = null;
    if (this.vadWorker) {
      this.vadWorker.terminate();
      this.vadWorker = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private processAudio() {
    if (!this.isListening || !this.analyser || !this.vadWorker) return;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatFrequencyData(dataArray);
    this.vadWorker.postMessage({ command: 'process', audioData: dataArray, timestamp: Date.now() });
    requestAnimationFrame(() => this.processAudio());
  }

  private handleVADResult(data: { isSpeech: boolean; confidence: number; timestamp: number }) {
    const { isSpeech, confidence, timestamp } = data;
    if (isSpeech && confidence > this.vadThreshold) {
      this.handleSpeechDetection(timestamp);
    } else {
      this.handleSilenceDetection(timestamp);
    }
  }

  private handleSpeechDetection(timestamp: number) {
    if (!this.isSpeaking) {
      this.speechStart = timestamp;
      this.silenceStart = null;
      setTimeout(() => {
        if (this.speechStart === timestamp) {
          this.isSpeaking = true;
          this.onSpeechStart?.(timestamp);
        }
      }, this.minSpeechDuration);
    }
  }

  private handleSilenceDetection(timestamp: number) {
    if (this.isSpeaking && !this.silenceStart) {
      this.silenceStart = timestamp;
      setTimeout(() => {
        if (this.silenceStart === timestamp) {
          this.isSpeaking = false;
          this.speechStart = null;
          this.onSpeechEnd?.(timestamp);
        }
      }, this.minSilenceDuration);
    }
  }

  adjustForInterviewContext(phase: 'introduction' | 'technical' | 'behavioral') {
    const contextSettings: Record<string, Partial<InterviewVADOptions>> = {
      introduction: { vadThreshold: 0.5, minSilenceDuration: 1200 },
      technical: { vadThreshold: 0.6, minSilenceDuration: 2000 },
      behavioral: { vadThreshold: 0.55, minSilenceDuration: 1000 },
    };
    const settings = contextSettings[phase] || {};
    this.vadThreshold = settings.vadThreshold ?? this.vadThreshold;
    this.minSilenceDuration = settings.minSilenceDuration ?? this.minSilenceDuration;
  }
}


