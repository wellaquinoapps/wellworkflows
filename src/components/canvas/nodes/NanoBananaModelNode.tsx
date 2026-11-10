import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cpu, ChevronDown, Zap, Star, FlaskConical, BrainCircuit } from 'lucide-react';
import { AspectRatio, ImageModel, IMAGE_MODELS } from '@/types';

interface NanoBananaModelNodeProps {
  id: string;
  data: {
    aspectRatio: AspectRatio;
    outputCount: number;
    selectedModel: ImageModel;
    onRatioChange?: (ratio: AspectRatio) => void;
    onCountChange?: (count: number) => void;
    onModelChange?: (model: ImageModel) => void;
  };
}

const badgeIconMap: Record<string, React.ReactNode> = {
  emerald: <Star className="w-2.5 h-2.5" />,
  amber:   <Zap className="w-2.5 h-2.5" />,
  sky:     <FlaskConical className="w-2.5 h-2.5" />,
  violet:  <BrainCircuit className="w-2.5 h-2.5" />,
};

const badgeClassMap: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  amber:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
  sky:     'bg-sky-500/15 text-sky-400 border-sky-500/25',
  violet:  'bg-violet-500/15 text-violet-400 border-violet-500/25',
};

const dotClassMap: Record<string, string> = {
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  sky:     'bg-sky-400',
  violet:  'bg-violet-400',
};

export const NanoBananaModelNode: React.FC<NanoBananaModelNodeProps> = ({ data }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedInfo = IMAGE_MODELS.find((m) => m.id === data.selectedModel) ?? IMAGE_MODELS[0];

  return (
    <div className="w-80 bg-surface-card/95 border-2 border-primary/50 hover:border-primary rounded-xl shadow-2xl overflow-visible backdrop-blur-md text-slate-100 font-sans transition-all relative">
      {/* Target Ports */}
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
            <span className="text-[9px] text-slate-400 font-mono">{selectedInfo.name}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          ONLINE
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3">
        {/* Port indicators */}
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

        {/* ── Model Selector ── */}
        <div className="relative">
          <label className="text-[10px] text-slate-400 block mb-1">Modelo de Geração:</label>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-surface border border-surface-border hover:border-primary/60 transition-colors text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClassMap[selectedInfo.badgeColor]}`} />
              <span className="text-xs font-semibold text-white truncate">{selectedInfo.name}</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-0.5 flex-shrink-0 ${badgeClassMap[selectedInfo.badgeColor]}`}
              >
                {badgeIconMap[selectedInfo.badgeColor]}
                {selectedInfo.badge}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-[#131622] border border-surface-border rounded-xl shadow-2xl overflow-hidden">
              {IMAGE_MODELS.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    data.onModelChange?.(model.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 flex items-start gap-2.5 text-left hover:bg-primary/10 transition-colors border-b border-surface-border last:border-0 ${
                    data.selectedModel === model.id ? 'bg-primary/15' : ''
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${dotClassMap[model.badgeColor]}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-white">{model.name}</span>
                      <span
                        className={`text-[9px] font-mono px-1 py-0.5 rounded border flex items-center gap-0.5 ${badgeClassMap[model.badgeColor]}`}
                      >
                        {badgeIconMap[model.badgeColor]}
                        {model.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{model.description}</p>
                    <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{model.id}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
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

      {/* Source Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-render-out"
        className="!w-3 !h-3 !bg-primary !border-2 !border-surface-card !-right-1.5"
      />
    </div>
  );
};
