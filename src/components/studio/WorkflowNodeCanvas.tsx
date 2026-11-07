import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Image as ImageIcon, 
  FileText, 
  Maximize2, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { LocalReferenceImage, AspectRatio, WorkflowImage } from '@/types';
import { cn } from '@/lib/utils';

interface WorkflowNodeCanvasProps {
  referenceImages: LocalReferenceImage[];
  prompt: string;
  aspectRatio: AspectRatio;
  outputCount: number;
  results: WorkflowImage[];
  isGenerating: boolean;
  onOpenImageUpload: () => void;
  onEditPrompt: () => void;
  onSelectRatio: () => void;
  onPreviewImage: (url: string) => void;
}

export const WorkflowNodeCanvas: React.FC<WorkflowNodeCanvasProps> = ({
  referenceImages,
  prompt,
  aspectRatio,
  outputCount,
  results,
  isGenerating,
  onOpenImageUpload,
  onEditPrompt,
  onSelectRatio,
  onPreviewImage,
}) => {
  const scenarioImg = referenceImages.find(
    (img) => img.roleType === 'Cenário' || img.position === 1
  );
  const productImgs = referenceImages.filter(
    (img) => img !== scenarioImg
  );

  return (
    <div className="w-full bg-surface-card border border-surface-border rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-light">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Fluxo Visual de Composição (Google Flow)
            </h3>
            <p className="text-xs text-slate-400">
              Conexão entre imagens de entrada, instruções de IA e sintetização
            </p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-surface border border-surface-border text-slate-300 font-mono hidden sm:inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Nós Ativos
        </span>
      </div>

      {/* Interactive Node Flow: Left Inputs -> Center Processing -> Right Outputs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-center relative z-10">
        
        {/* NODE 1: INPUT IMAGES (Col 1-4) */}
        <div className="md:col-span-4 bg-surface border border-surface-border hover:border-slate-600 rounded-xl p-4 space-y-3 transition-all relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-primary" />
              NÓ 1: Entradas ({referenceImages.length}/4)
            </span>
            <button
              type="button"
              onClick={onOpenImageUpload}
              className="text-[11px] text-primary-light hover:underline font-medium"
            >
              Gerenciar
            </button>
          </div>

          {referenceImages.length === 0 ? (
            <div 
              onClick={onOpenImageUpload}
              className="py-6 border-2 border-dashed border-surface-border hover:border-primary/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
            >
              <ImageIcon className="w-6 h-6 text-slate-500 mb-1" />
              <p className="text-xs font-medium text-slate-300">Adicione Cenário & Produtos</p>
              <p className="text-[10px] text-slate-500">1 Cenário + 2 Produtos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Scenario Box */}
              {scenarioImg && (
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-card border border-surface-border">
                  <img
                    src={scenarioImg.previewUrl}
                    alt="Cenário"
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Cenário Principal
                    </span>
                    <p className="text-xs text-slate-300 truncate font-mono">
                      Ref #{scenarioImg.position}
                    </p>
                  </div>
                </div>
              )}

              {/* Product Boxes */}
              <div className="grid grid-cols-2 gap-2">
                {productImgs.map((prod, idx) => (
                  <div 
                    key={prod.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-card border border-surface-border"
                  >
                    <img
                      src={prod.previewUrl}
                      alt="Produto"
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[9px] font-semibold text-cyan-400 block truncate">
                        Produto #{idx + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Ref #{prod.position}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Port Pin (Right side on Desktop) */}
          <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary border-4 border-surface-card items-center justify-center text-white shadow-md">
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* NODE 2: PROMPT & IA INSTRUCTION ENGINE (Col 5-8) */}
        <div className="md:col-span-4 bg-surface border border-surface-border hover:border-slate-600 rounded-xl p-4 space-y-3 transition-all relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              NÓ 2: Modelo IA (Nano Banana)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Imagen 3.0
            </span>
          </div>

          <div 
            onClick={onEditPrompt}
            className="p-3 rounded-lg bg-surface-card border border-surface-border hover:border-slate-600 cursor-pointer transition-colors"
          >
            <p className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
              <span>Instrução de Composição</span>
              <span className="text-primary-light text-[10px]">Editar</span>
            </p>
            <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
              {prompt || 'Nenhum prompt definido. Clique para inserir as instruções...'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div 
              onClick={onSelectRatio}
              className="p-2 rounded-lg bg-surface-card border border-surface-border flex items-center justify-between cursor-pointer hover:border-slate-600 transition-colors"
            >
              <span className="text-[10px] text-slate-400">Proporção:</span>
              <span className="font-mono font-bold text-white">{aspectRatio}</span>
            </div>
            <div className="p-2 rounded-lg bg-surface-card border border-surface-border flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Saídas:</span>
              <span className="font-mono font-bold text-white">{outputCount} independentes</span>
            </div>
          </div>

          {/* Connection Port Pin */}
          <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-500 border-4 border-surface-card items-center justify-center text-white shadow-md">
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* NODE 3: OUTPUT RESULTS (Col 9-12) */}
        <div className="md:col-span-4 bg-surface border border-surface-border hover:border-slate-600 rounded-xl p-4 space-y-3 transition-all relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              NÓ 3: Saídas ({results.length}/{outputCount})
            </span>
            {isGenerating && (
              <span className="text-[10px] text-indigo-400 animate-pulse font-mono">
                Sintetizando...
              </span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="py-8 border-2 border-dashed border-surface-border rounded-xl flex flex-col items-center justify-center text-center">
              {isGenerating ? (
                <>
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
                  <p className="text-xs text-slate-400">Gerando imagens com IA...</p>
                </>
              ) : (
                <>
                  <Layers className="w-6 h-6 text-slate-600 mb-1" />
                  <p className="text-xs text-slate-400">Aguardando execução</p>
                  <p className="text-[10px] text-slate-600">Até 4 saídas em alta resolução</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {results.map((res) => (
                <div 
                  key={res.id || res.position}
                  onClick={() => res.signed_url && onPreviewImage(res.signed_url)}
                  className="aspect-square rounded-lg bg-black/60 border border-surface-border overflow-hidden relative cursor-pointer group hover:border-primary transition-all"
                >
                  {res.status === 'completed' && res.signed_url ? (
                    <>
                      <img
                        src={res.signed_url}
                        alt={`Resultado ${res.position}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-mono text-white">
                        #{res.position}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-[10px] text-slate-500">
                      {res.status === 'processing' ? (
                        <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>Falha</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

