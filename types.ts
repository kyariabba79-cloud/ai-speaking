export interface ScriptLine {
  id: string;
  speaker: string;
  text: string;
  audioUrl?: string;
  isGenerating?: boolean;
}

export interface VoiceConfig {
  voiceName: string; // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
  speed: number; // 0.5 to 2.0 (Simulated in playback or SSML if supported)
  pitch: number; // -10 to 10 (Simulated)
  volume: number; // 0 to 1
  isCloned?: boolean;
  cloneSource?: string; // name of cloned voice
}

export interface SpeakerProfile {
  name: string;
  config: VoiceConfig;
}

export interface ClonedVoice {
  id: string;
  name: string;
  baseVoice: string; // The underlying Gemini voice used
  description: string; // Analysis result
  dateCreated: string;
}

export const AVAILABLE_VOICES = [
  { name: 'Puck', gender: 'Male', style: 'Deep, Resonant' },
  { name: 'Charon', gender: 'Male', style: 'Steady, Professional' },
  { name: 'Kore', gender: 'Female', style: 'Calm, Soothing' },
  { name: 'Fenrir', gender: 'Male', style: 'Energetic, Intense' },
  { name: 'Zephyr', gender: 'Female', style: 'Bright, Clear' },
];
