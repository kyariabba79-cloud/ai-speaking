import React, { useState } from 'react';
import { Settings, Play, Volume2, Mic } from 'lucide-react';
import { SpeakerProfile, ClonedVoice, AVAILABLE_VOICES } from '../types';
import { generateSpeech } from '../services/geminiService';

interface VoiceMapperProps {
  speakers: string[];
  profiles: Record<string, SpeakerProfile>;
  clonedVoices: ClonedVoice[];
  onProfileUpdate: (speaker: string, updates: Partial<SpeakerProfile['config']>) => void;
  onOpenCloneModal: () => void;
}

export const VoiceMapper: React.FC<VoiceMapperProps> = ({ 
  speakers, 
  profiles, 
  clonedVoices, 
  onProfileUpdate,
  onOpenCloneModal
}) => {
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  const handlePreview = async (speaker: string, voiceName: string) => {
    if (playingPreview) return;
    setPlayingPreview(speaker);
    try {
      const buffer = await generateSpeech(`Hello, I am ${speaker}.`, voiceName);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createBufferSource();
      const audioBuffer = await audioCtx.decodeAudioData(buffer);
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start(0);
      source.onended = () => setPlayingPreview(null);
    } catch (e) {
      console.error(e);
      setPlayingPreview(null);
    }
  };

  if (speakers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 border border-dashed border-slate-700 rounded-lg">
        <Volume2 size={48} className="mb-4 opacity-50" />
        <p>No speakers detected yet.</p>
        <p className="text-sm">Type in the script box to begin mapping.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
       <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-blue-400">2.</span> Voice Mapping
        </h2>
        <button 
          onClick={onOpenCloneModal}
          className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
        >
          <Mic size={12} /> New Clone
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {speakers.map((speaker) => {
          const profile = profiles[speaker] || { 
            name: speaker, 
            config: { voiceName: 'Puck', speed: 1, pitch: 0, volume: 1 } 
          };
          
          return (
            <div key={speaker} className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div className="font-bold text-lg text-slate-200 truncate max-w-[150px]" title={speaker}>
                  {speaker}
                </div>
                <button 
                  onClick={() => handlePreview(speaker, profile.config.voiceName)}
                  disabled={!!playingPreview}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  {playingPreview === speaker ? 'Playing...' : <><Play size={14} /> Test Voice</>}
                </button>
              </div>

              {/* Voice Selector */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Model</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.config.isCloned ? profile.config.cloneSource : profile.config.voiceName}
                  onChange={(e) => {
                    const value = e.target.value;
                    const isClone = clonedVoices.some(cv => cv.name === value);
                    if (isClone) {
                      const clone = clonedVoices.find(cv => cv.name === value);
                      onProfileUpdate(speaker, { 
                        isCloned: true, 
                        cloneSource: value, 
                        voiceName: clone?.baseVoice || 'Puck' 
                      });
                    } else {
                      onProfileUpdate(speaker, { 
                        isCloned: false, 
                        voiceName: value 
                      });
                    }
                  }}
                >
                  <optgroup label="Google Studio Voices">
                    {AVAILABLE_VOICES.map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.gender} - {v.style})</option>
                    ))}
                  </optgroup>
                  {clonedVoices.length > 0 && (
                    <optgroup label="My Cloned Voices">
                      {clonedVoices.map(cv => (
                        <option key={cv.id} value={cv.name}>{cv.name} (Custom)</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Speed: {profile.config.speed}x</label>
                  <input 
                    type="range" min="0.5" max="2" step="0.1"
                    value={profile.config.speed}
                    onChange={(e) => onProfileUpdate(speaker, { speed: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Pitch: {profile.config.pitch}</label>
                  <input 
                    type="range" min="-5" max="5" step="1"
                    value={profile.config.pitch}
                    onChange={(e) => onProfileUpdate(speaker, { pitch: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Vol: {Math.round(profile.config.volume * 100)}%</label>
                  <input 
                    type="range" min="0" max="1" step="0.1"
                    value={profile.config.volume}
                    onChange={(e) => onProfileUpdate(speaker, { volume: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
