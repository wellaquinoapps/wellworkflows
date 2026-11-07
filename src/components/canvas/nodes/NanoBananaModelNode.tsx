import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkles, Cpu, Layers } from 'lucide-react';
import { AspectRatio } from '@/types';

interface NanoBananaModelNodeProps {
  id: string;
  data: {
    aspectRatio: AspectRatio;
    outputCount: number;
    onRatioChange?: (ratio: AspectRatio) => void;
    onCountChange?: (count: number) => void;
  };
}

export const NanoBananaModelNode: React.FC<NanoBananaModelNodeProps> = ({ data }) => {
  return (
    <div className="w-72 bg-surface-card/95 border-2 border-primary/50 hover:border-primary rounded-xl shadow-2xl overflow-hidden backdrop-blur-md text-slate-100 font-sans transition-all relative">
      {/* Target Ports (Inputs from Images and Prompt) */}
      <Handle
        type="target"
        position={Position.Left}
        id="scenario-in"
        style={{ top: '25%' }}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-surface-card !-left-1.5"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="product-in"
        style={{ top: '50%' }}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-surface-card !-left-1.5"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-in"
        style={{ top: '75%' }}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-surface-card !-left-1.5"
      />

      {/* Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-primary/30 via-surface to-surface border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center shadow-md">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide block">Nano Banana Engine</span>
            <span className="text-[9px] text-slate-400">Google Imagen 3.0</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          ONLINE
        </span>
      </div>

      {/* Body Configurations */}
      <div className="p-3.5 space-y-3">
        {/* Input indicators */}
        <div className="space-y-1 bg-surface p-2 rounded-lg border border-surface-border text-[10px]">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Entrada Cenário
            </span>
            <span className="text-slate-500 font-mono">Port #1</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Entrada Produtos
            </span>
            <span className="text-slate-500 font-mono">Port #2</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> Entrada Prompt
            </span>
            <span className="text-slate-500 font-mono">Port #3</span>
          </div>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Proporção:</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['9:16', '16:9', '1:1'] as AspectRatio[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => data.onRatioChange?.(r)}
                className={`py-1 rounded text-[11px] font-mono font-semibold border transition-all ${
                  data.aspectRatio === r
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface text-slate-400 border-surface-border hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Output Count */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Qtd Saídas Independentes:</label>
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => data.onCountChange?.(c)}
                className={`py-1 rounded text-[11px] font-bold border transition-all ${
                  data.outputCount === c
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-slate-400 border-surface-border hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Source Output Port (Connected to Result Preview Node) */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-render-out"
        className="!w-3 !h-3 !bg-primary !border-2 !border-surface-card !-right-1.5"
      />
    </div>
  );
};

