import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, Download, Eye, Sparkles } from 'lucide-react';
import { WorkflowImage } from '@/types';

interface OutputPreviewNodeProps {
  id: string;
  data: {
    results: WorkflowImage[];
    isGenerating: boolean;
    onPreviewImage?: (url: string) => void;
  };
}

export const OutputPreviewNode: React.FC<OutputPreviewNodeProps> = ({ data }) => {
  return (
    <div className="w-80 bg-surface-card/95 border-2 border-emerald-500/50 hover:border-emerald-500 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md text-slate-100 font-sans transition-all relative">
      {/* Target input port from model */}
      <Handle
        type="target"
        position={Position.Left}
        id="render-in"
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-surface-card !-left-1.5"
      />

      {/* Header */}
      <div className="px-3.5 py-2.5 bg-surface border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide block">Painel de Saídas</span>
            <span className="text-[9px] text-slate-400">Resultados da Composição</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          {data.results.length} GERADAS
        </span>
      </div>

      {/* Body: Output Gallery Grid */}
      <div className="p-3">
        {data.results.length === 0 ? (
          <div className="aspect-video w-full rounded-lg border border-dashed border-surface-border flex flex-col items-center justify-center p-4 text-center">
            {data.isGenerating ? (
              <>
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs text-slate-300">Sintetizando no Google Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6 text-slate-600 mb-1" />
                <span className="text-xs text-slate-400">Execute o workflow para ver as saídas</span>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {data.results.map((res) => (
              <div
                key={res.id || res.position}
                onClick={() => res.signed_url && data.onPreviewImage?.(res.signed_url)}
                className="aspect-square rounded-lg bg-black/60 border border-surface-border overflow-hidden relative cursor-pointer group hover:border-emerald-400 transition-all"
              >
                {res.status === 'completed' && res.signed_url ? (
                  <>
                    <img
                      src={res.signed_url}
                      alt={`Saída ${res.position}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute top-1 left-1 bg-black/70 px-1 rounded text-[9px] font-mono text-white">
                      #{res.position}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-500 p-2 text-center">
                    {res.status === 'processing' ? 'Processando...' : 'Falha'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

