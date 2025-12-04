import React, { useState, useEffect } from 'react';
import { ScriptLine } from '../types';

interface ScriptEditorProps {
  onScriptChange: (lines: ScriptLine[]) => void;
  initialText?: string;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ onScriptChange, initialText = '' }) => {
  const [text, setText] = useState(initialText);

  // Regex to match "Speaker: Text" or "[Speaker: Text]"
  const parseScript = (input: string): ScriptLine[] => {
    const lines = input.split('\n');
    const parsed: ScriptLine[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const match = trimmed.match(/^\[?([\w\s\d]+)\]?:\s*(.+)$/);
      
      if (match) {
        parsed.push({
          id: `line-${index}-${Date.now()}`,
          speaker: match[1].trim(),
          text: match[2].trim(),
        });
      }
    });
    return parsed;
  };

  useEffect(() => {
    const lines = parseScript(text);
    onScriptChange(lines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-blue-400">1.</span> Script Input
        </h2>
        <span className="text-xs text-slate-400">Supports: [Name: Text]</span>
      </div>
      <textarea
        className="flex-1 w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed resize-none"
        placeholder={`[Speaker 1: Hello, how are you?]\n[Speaker 2: I'm good!]\n\nOR\n\nNarrator: Once upon a time...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
};
