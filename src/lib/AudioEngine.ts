import * as math from 'mathjs';

export type SonifyMode = 'sweep' | 'waveform';

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;

  init() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
  }

  stop() {
    if (this.osc) {
      try { this.osc.stop(); } catch(e) {}
      this.osc.disconnect();
      this.osc = null;
    }
    if (this.source) {
      try { this.source.stop(); } catch(e) {}
      this.source.disconnect();
      this.source = null;
    }
    if (this.gain) {
      this.gain.disconnect();
      this.gain = null;
    }
  }

  playSweep(expr: string, xMin: number, xMax: number, duration: number = 3): number {
    this.init();
    this.stop();
    if (!this.audioCtx) return 0;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    let node;
    try {
      node = math.compile(expr);
    } catch(e) {
      return 0; // Invalid expression
    }

    const numPoints = 200;
    const yValues: number[] = [];
    for (let i = 0; i <= numPoints; i++) {
        const x = xMin + (i / numPoints) * (xMax - xMin);
        try {
            const val = node.evaluate({ x, t: x });
            yValues.push(typeof val === 'number' ? val : 0);
        } catch(e) {
            yValues.push(0);
        }
    }
    
    const validY = yValues.filter(y => !isNaN(y) && isFinite(y));
    const minY = validY.length ? Math.min(...validY) : 0;
    const maxY = validY.length ? Math.max(...validY) : 0;
    
    const mapYToFreq = (y: number) => {
        if (maxY === minY) return 440;
        const normalized = (y - minY) / (maxY - minY);
        return 110 * Math.pow(8, normalized); // 110Hz to 880Hz
    };

    const freqs = Float32Array.from(yValues.map(y => isNaN(y) || !isFinite(y) ? 10 : mapYToFreq(y)));

    this.osc = this.audioCtx.createOscillator();
    this.gain = this.audioCtx.createGain();

    this.osc.type = 'sine'; // Can be customized later
    
    const now = this.audioCtx.currentTime;
    
    try {
      this.osc.frequency.setValueAtTime(freqs[0], now);
      this.osc.frequency.setValueCurveAtTime(freqs, now, duration);
    } catch(e) {
      // Fallback if curve fails
      this.osc.frequency.setValueAtTime(440, now);
    }
    
    // Smooth envelope to avoid clicks
    this.gain.gain.setValueAtTime(0, now);
    this.gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    this.gain.gain.setValueAtTime(0.5, now + duration - 0.1);
    this.gain.gain.linearRampToValueAtTime(0, now + duration);

    this.osc.connect(this.gain);
    this.gain.connect(this.audioCtx.destination);
    
    this.osc.start(now);
    this.osc.stop(now + duration);
    
    return duration;
  }

  playWaveform(expr: string, duration: number = 2): number {
      this.init();
      this.stop();
      if (!this.audioCtx) return 0;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      let node;
      try {
        node = math.compile(expr);
      } catch(e) {
        return 0;
      }

      const sampleRate = this.audioCtx.sampleRate;
      const buffer = this.audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
          const x = i / sampleRate;
          try {
             let val = node.evaluate({ x, t: x });
             if (isNaN(val) || !isFinite(val)) val = 0;
             // Hard clip limit
             data[i] = Math.max(-1, Math.min(1, val));
          } catch(e) {
             data[i] = 0;
          }
      }

      this.source = this.audioCtx.createBufferSource();
      this.source.buffer = buffer;
      
      this.gain = this.audioCtx.createGain();
      this.source.connect(this.gain);
      this.gain.connect(this.audioCtx.destination);

      // Simple click-free envelope
      this.gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.gain.gain.linearRampToValueAtTime(0.5, this.audioCtx.currentTime + 0.05);
      this.gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime + duration - 0.1);
      this.gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + duration);

      this.source.start();
      return duration;
  }
}
