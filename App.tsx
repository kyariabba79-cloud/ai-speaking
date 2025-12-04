import React, { useState, useRef, useEffect } from 'react';
import { ScriptEditor } from './components/ScriptEditor';
import { VoiceMapper } from './components/VoiceMapper';
import { VoiceCloneModal } from './components/VoiceCloneModal';
import { ScriptLine, SpeakerProfile, ClonedVoice, VoiceConfig } from './types';
import { generateSpeech } from './services/geminiService';
import { Play, Download, Loader2, Music, Save } from 'lucide-react';

export default function App() {
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>([]);
  const [profiles, setProfiles] = useState<Record<string, SpeakerProfile>>({});
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bgMusicFile, setBgMusicFile] = useState<File | null>(null);
  const [audioElements, setAudioElements] = useState<HTMLAudioElement[]>([]);
  const [isPlayingFull, setIsPlayingFull] = useState(false);

  // Background Music Ref
  const bgMusicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Derive unique speakers from script lines
  const speakers = Array.from(new Set(scriptLines.map(l => l.speaker))) as string[];

  // Sync profiles when speakers change (auto-map)
  useEffect(() => {
    setProfiles(prev => {
      const newProfiles = { ...prev };
      speakers.forEach((speaker: string) => {
        if (!newProfiles[speaker]) {
          newProfiles[speaker] = {
            name: speaker,
            config: {
              voiceName: 'Puck', // Default
              speed: 1,
              pitch: 0,
              volume: 1
            }
          };
        }
      });
      return newProfiles;
    });
  }, [speakers]); // Only run when speaker list changes derived from scriptLines

  const handleScriptChange = (lines: ScriptLine[]) => {
    // Preserve audio URLs if line IDs match (simple heuristic, could be better)
    setScriptLines(prev => {
      return lines.map(newLine => {
        const existing = prev.find(p => p.speaker === newLine.speaker && p.text === newLine.text);
        if (existing && existing.audioUrl) {
          return { ...newLine, audioUrl: existing.audioUrl };
        }
        return newLine;
      });
    });
  };

  const handleProfileUpdate = (speaker: string, updates: Partial<VoiceConfig>) => {
    setProfiles(prev => ({
      ...prev,
      [speaker]: {
        ...prev[speaker],
        config: { ...prev[speaker].config, ...updates }
      }
    }));
  };

  const handleGenerateAll = async () => {
    if (scriptLines.length === 0) return;
    setIsGenerating(true);

    const newLines = [...scriptLines];

    for (let i = 0; i < newLines.length; i++) {
      const line = newLines[i];
      // Skip if already generated and text hasn't changed (simplified check)
      if (line.audioUrl) continue;

      const profile = profiles[line.speaker];
      if (!profile) continue;

      try {
        // Optimistic UI update
        newLines[i].isGenerating = true;
        setScriptLines([...newLines]);

        const audioBuffer = await generateSpeech(line.text, profile.config.voiceName);
        const blob = new Blob([audioBuffer], { type: 'audio/wav' }); 
        
        const url = URL.createObjectURL(blob);
        newLines[i].audioUrl = url;
        newLines[i].isGenerating = false;
        setScriptLines([...newLines]);
      } catch (error) {
        console.error(`Error generating line ${i}:`, error);
        newLines[i].isGenerating = false;
        setScriptLines([...newLines]);
      }
    }

    setIsGenerating(false);
  };

  const playFullStory = async () => {
    if (isPlayingFull) {
      // Stop logic
      audioElements.forEach(el => {
        el.pause();
        el.currentTime = 0;
      });
      if (bgMusicAudioRef.current) {
        bgMusicAudioRef.current.pause();
        bgMusicAudioRef.current.currentTime = 0;
      }
      setIsPlayingFull(false);
      return;
    }

    // Start Logic
    const audios: HTMLAudioElement[] = [];
    
    // Prepare audio elements
    scriptLines.forEach(line => {
      if (line.audioUrl) {
        const audio = new Audio(line.audioUrl);
        const profile = profiles[line.speaker];
        if (profile) {
            audio.playbackRate = profile.config.speed;
            audio.volume = profile.config.volume;
            // Pitch is not easily adjustable on HTMLAudioElement without WebAudioAPI context, skipping for MVP playback
        }
        audios.push(audio);
      }
    });

    if (audios.length === 0) return;

    setAudioElements(audios);
    setIsPlayingFull(true);

    // Play Background Music
    if (bgMusicFile) {
        if (!bgMusicAudioRef.current) {
            bgMusicAudioRef.current = new Audio(URL.createObjectURL(bgMusicFile));
            bgMusicAudioRef.current.loop = true;
            bgMusicAudioRef.current.volume = 0.3; // Default background volume
        }
        bgMusicAudioRef.current.play();
    }

    // Sequential Playback
    let currentIndex = 0;
    const playNext = () => {
      if (currentIndex >= audios.length) {
        setIsPlayingFull(false);
        if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
        return;
      }
      const audio = audios[currentIndex];
      audio.onended = () => {
        currentIndex++;
        playNext();
      };
      audio.play();
    };

    playNext();
  };

  const handleDownloadLine = (line: ScriptLine) => {
    if (!line.audioUrl) return;
    const a = document.createElement('a');
    a.href = line.audioUrl;
    a.download = `${line.speaker}_${line.id}.wav`;
    a.click();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-slate-700 bg-slate-950 flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
             <span className="font-bold text-white text-lg">R</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight">Robert Tech Tool Voice</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">AI Story Narrator</p>
          </div>
        </div>
        <div className="flex gap-4">
             {/* Background Music Input */}
            <div className="relative group">
                <input 
                    type="file" 
                    accept="audio/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setBgMusicFile(e.target.files ? e.target.files[0] : null)}
                />
                <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${bgMusicFile ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                    <Music size={16} />
                    <span className="text-sm font-medium">{bgMusicFile ? 'Music Added' : 'Add BG Music'}</span>
                </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-medium">
                <Save size={16} /> Save Project
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Script */}
        <div className="flex-1 p-6 border-r border-slate-800 flex flex-col min-w-[350px]">
          <ScriptEditor onScriptChange={handleScriptChange} />
        </div>

        {/* Right: Voices */}
        <div className="w-[400px] bg-slate-900 p-6 border-l border-slate-800 flex flex-col flex-shrink-0">
          <VoiceMapper 
            speakers={speakers}
            profiles={profiles}
            clonedVoices={clonedVoices}
            onProfileUpdate={handleProfileUpdate}
            onOpenCloneModal={() => setIsCloneModalOpen(true)}
          />
        </div>
      </main>

      {/* Footer: Actions & Timeline/Preview */}
      <footer className="h-auto min-h-[140px] border-t border-slate-800 bg-slate-950 p-6 flex flex-col gap-4 flex-shrink-0">
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-400 uppercase">3. Production & Output</h3>
            <div className="flex gap-3">
                 <button 
                    onClick={playFullStory}
                    disabled={scriptLines.length === 0}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
                        isPlayingFull 
                        ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30' 
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
                    }`}
                >
                    {isPlayingFull ? 'Stop Playback' : <><Play size={18} /> Preview Full Story</>}
                </button>

                <button 
                    onClick={handleGenerateAll}
                    disabled={isGenerating || scriptLines.length === 0}
                    className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} fill="currentColor" />}
                    {isGenerating ? 'Generating Audio...' : 'Generate Audio'}
                </button>
            </div>
        </div>

        {/* Mini Timeline Visualization / File List */}
        <div className="flex-1 bg-slate-900 rounded-lg border border-slate-800 p-3 overflow-x-auto whitespace-nowrap scrollbar-hide flex items-center gap-2">
            {scriptLines.length === 0 && <span className="text-xs text-slate-600 mx-auto">Script timeline will appear here...</span>}
            
            {scriptLines.map((line, idx) => (
                <div key={line.id} className="inline-flex flex-col gap-1 w-[120px] group relative">
                    <div className={`h-12 rounded-md border flex items-center justify-center relative overflow-hidden transition-colors ${line.audioUrl ? 'bg-blue-900/30 border-blue-500/50' : 'bg-slate-800 border-slate-700'}`}>
                        {line.isGenerating ? (
                             <Loader2 size={16} className="text-blue-400 animate-spin" />
                        ) : line.audioUrl ? (
                            <div className="flex gap-2">
                                <button onClick={() => new Audio(line.audioUrl).play()} className="p-1 hover:bg-blue-500 rounded-full text-blue-300 hover:text-white transition-colors">
                                    <Play size={14} fill="currentColor" />
                                </button>
                                <button onClick={() => handleDownloadLine(line)} className="p-1 hover:bg-green-500 rounded-full text-green-300 hover:text-white transition-colors">
                                    <Download size={14} />
                                </button>
                            </div>
                        ) : (
                            <span className="text-[10px] text-slate-600">No Audio</span>
                        )}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
                        <span className="truncate font-medium max-w-[80px]">{line.speaker}</span>
                        <span>#{idx + 1}</span>
                    </div>
                </div>
            ))}
        </div>
      </footer>

      {/* Modals */}
      <VoiceCloneModal 
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onSave={(newVoice) => setClonedVoices(prev => [...prev, newVoice])}
      />
    </div>
  );
}