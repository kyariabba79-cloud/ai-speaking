import React, { useState } from 'react';
import { X, Mic, Upload, Activity, Check } from 'lucide-react';
import { ClonedVoice, AVAILABLE_VOICES } from '../types';
import { analyzeVoiceSample } from '../services/geminiService';

interface VoiceCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (voice: ClonedVoice) => void;
}

export const VoiceCloneModal: React.FC<VoiceCloneModalProps> = ({ isOpen, onClose, onSave }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [cloneName, setCloneName] = useState('');
  
  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeVoiceSample(file);
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisResult("Failed to analyze audio.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!analysisResult || !cloneName) return;
    
    // Simplistic mapping logic: map to a random voice for demo, 
    // or logically map based on "Male"/"Female" in analysis text if we parsed it.
    // For now, we pick 'Zephyr' as a default neutral base or random.
    const baseVoice = AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)].name;

    const newVoice: ClonedVoice = {
      id: `clone-${Date.now()}`,
      name: cloneName,
      baseVoice: baseVoice,
      description: analysisResult,
      dateCreated: new Date().toISOString()
    };
    onSave(newVoice);
    onClose();
    
    // Reset state
    setFile(null);
    setAnalysisResult(null);
    setCloneName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Mic className="text-purple-400" /> Clone Voice
        </h2>

        <div className="space-y-4">
          {/* Step 1: Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              1. Upload Sample (MP3/WAV)
            </label>
            <div className="relative">
              <input 
                type="file" 
                accept="audio/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-slate-700 file:text-blue-400
                  hover:file:bg-slate-600
                  cursor-pointer"
              />
            </div>
          </div>

          {/* Step 2: Analyze */}
          {file && (
            <div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !!analysisResult}
                className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
                  analysisResult 
                    ? 'bg-green-600/20 text-green-400 border border-green-600/50' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                } disabled:opacity-50`}
              >
                {isAnalyzing ? (
                  <>
                    <Activity className="animate-spin" size={18} /> Analyzing Tone...
                  </>
                ) : analysisResult ? (
                  <>
                    <Check size={18} /> Analysis Complete
                  </>
                ) : (
                  "Analyze Voice"
                )}
              </button>
            </div>
          )}

          {/* Step 3: Result & Name */}
          {analysisResult && (
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-400 uppercase font-semibold mb-1">AI Analysis</p>
              <p className="text-sm text-slate-200 italic">"{analysisResult}"</p>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Name this Voice
                </label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="e.g., Hero Clone, Emma Custom"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!cloneName}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                Save to Library
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
