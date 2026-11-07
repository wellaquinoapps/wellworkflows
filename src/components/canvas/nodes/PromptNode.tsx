import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkles, MessageSquare } from 'lucide-react';

interface PromptNodeProps {
  id: string;
  data: {
    prompt: string;
    onPromptChange?: (val: string) => void;
  };
}

export const PromptNode: React.FC<PromptNodeProps> = ({ data }) => {
  return (
    <div className="w-80 bg-surface-card/95 border-2 border-surface-border hover:border-indigo-500/60 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md text-slate-100 font-sans transition-all">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-surface border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white tracking-wide">Instrução Textual (Prompt)</span>
        </div>
        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
          TEXT
        </span>
      </div>

      {/* Body */}
      <div className="p-3">
        <textarea
          rows={4}
          value={data.prompt}
          onChange={(e) => data.onPromptChange?.(e.target.value)}
          placeholder="Descreva as instruções de fusão, iluminação e composição..."
          className="w-full p-2.5 bg-surface border border-surface-border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
        />
        <p className="text-[10px] text-slate-500 mt-1.5">
          Conecte este nó ao gerador Nano Banana para orientar a composição.
        </p>
      </div>

      {/* Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        id="prompt-out"
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-surface-card !-right-1.5"
      />
    </div>
  );
};

