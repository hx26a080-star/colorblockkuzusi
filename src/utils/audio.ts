// Sound synth using Web Audio API for retro block-breaker sounds

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  getMuteStatus() {
    return this.isMuted;
  }

  private createOscillator(type: OscillatorType, freq: number, duration: number, gainStart: number): { osc: OscillatorNode, gain: GainNode } | null {
    this.initContext();
    if (!this.ctx || this.isMuted) return null;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainStart, this.ctx.currentTime);
      // Exponential decay
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      return { osc, gain };
    } catch (e) {
      return null;
    }
  }

  playPaddleHit() {
    const sound = this.createOscillator('triangle', 180, 0.15, 0.4);
    if (!sound) return;
    
    // Slight pitch bend downwards
    if (this.ctx) {
      sound.osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
    }
    sound.osc.start();
    sound.osc.stop(this.ctx!.currentTime + 0.15);
  }

  playWallBounce() {
    const sound = this.createOscillator('sine', 240, 0.1, 0.2);
    if (!sound) return;
    sound.osc.start();
    sound.osc.stop(this.ctx!.currentTime + 0.1);
  }

  playBrickHitWrong() {
    const sound = this.createOscillator('sawtooth', 120, 0.12, 0.15);
    if (!sound) return;
    if (this.ctx) {
      sound.osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.12);
    }
    sound.osc.start();
    sound.osc.stop(this.ctx!.currentTime + 0.12);
  }

  playBrickBreak(color: string) {
    // Elegant dual oscillator chime based on color
    let baseFreq = 440; // A4
    if (color === 'red') baseFreq = 349.23; // F4
    else if (color === 'blue') baseFreq = 392.00; // G4
    else if (color === 'green') baseFreq = 440.00; // A4
    else if (color === 'yellow') baseFreq = 523.25; // C5
    else if (color === 'white') baseFreq = 587.33; // D5

    // Primary oscillating note
    const s1 = this.createOscillator('sine', baseFreq, 0.3, 0.25);
    // Harmonics for elegant glass-shatter ring
    const s2 = this.createOscillator('sine', baseFreq * 1.5, 0.25, 0.15);
    const s3 = this.createOscillator('sine', baseFreq * 2.0, 0.2, 0.1);

    if (s1) {
      s1.osc.start();
      s1.osc.stop(this.ctx!.currentTime + 0.3);
    }
    if (s2) {
      s2.osc.start();
      s2.osc.stop(this.ctx!.currentTime + 0.25);
    }
    if (s3) {
      s3.osc.start();
      s3.osc.stop(this.ctx!.currentTime + 0.2);
    }
  }

  playPowerUp() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Synthesize a quick sparkling arpeggio
      const notes = [440, 554.37, 659.25, 880]; // Major chord spark
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(time);
        osc.stop(time + 0.3);
      });
    } catch (e) {}
  }

  playLevelComplete() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const theme = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]; // C major scale up!
      theme.forEach((freq, idx) => {
        const time = now + idx * 0.1;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(time);
        osc.stop(time + 0.25);
      });
    } catch (e) {}
  }

  playGameOver() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Slow descending sliding bass structure
      const notes = [220, 196, 174.61, 146.83];
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.25;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        if (idx === notes.length - 1) {
          // Slide down on final note
          osc.frequency.linearRampToValueAtTime(70, time + 0.6);
        }

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.linearRampToValueAtTime(0.0001, time + 0.55);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(time);
        osc.stop(time + 0.6);
      });
    } catch (e) {}
  }
}

export const sounds = new SoundEngine();
