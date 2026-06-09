// Kid-friendly dynamic sound effect generator using Web Audio API
class KidSynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    // Resume if suspended (browser security policy)
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playCorrect() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sine";
      
      // Cheery quick double chime
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.setValueAtTime(0.15, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }

  playIncorrect() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "triangle";
      
      // Soft disappointed slide
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25); // A2
      
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }

  playFanfare() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.5]; // C4 -> E4 -> G4 -> C5 -> E5 -> C6
      const rhythm = [0, 0.08, 0.16, 0.24, 0.32, 0.44];
      
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteTime = now + (rhythm[idx] || 0);
        const noteDuration = idx === notes.length - 1 ? 0.6 : 0.15;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = idx === notes.length - 1 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, noteTime);
        
        gain.gain.setValueAtTime(0.0, noteTime);
        gain.gain.linearRampToValueAtTime(0.12, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + noteDuration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(noteTime);
        osc.stop(noteTime + noteDuration);
      });
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }
}

export const synth = new KidSynth();
export default synth;
