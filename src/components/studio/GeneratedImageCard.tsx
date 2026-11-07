import React from 'react';
import { Download, RefreshCw, AlertCircle, Eye } from 'lucide-react';
import { WorkflowImage } from '@/types';
import { cn } from '@/lib/utils';

interface GeneratedImageCardProps {
  image: WorkflowImage;
  onRetrySingle?: (position: number) => void;
  onPreview: (url: string) => void;
  isRetrying?: boolean;
}

export const GeneratedImageCard: React.FC<GeneratedImageCardProps> = ({
  image,
  onRetrySingle,
  onPreview,
  isRetrying = false,
}) => {
  const isCompleted = image.status === 'completed';
  const isFailed = image.status === 'failed';
  const isProcessing = image.status === 'processing' || image.status === 'queued';

  const handleDownload = async () => {
    if (!image.signed_url) return;
    try {
      const res = await fetch(image.signed_url);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nanobanana-output-${image.position}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-surface-border overflow-hidden flex flex-col group relative">
      {/* Top Header Badge */}
      <div className="p-2.5 bg-surface-card border-b border-surface-border flex items-center justify-between text-xs">
        <span className="font-mono font-medium text-slate-300">Saída #{image.position}</span>
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded font-medium capitalize",
            isCompleted && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
            isProcessing && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse",
            isFailed && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          )}
        >
          {isProcessing ? 'Gerando...' : image.status}
        </span>
      </div>

      {/* Image Preview / Status Canvas */}
      <div className="relative aspect-square w-full bg-black/60 flex items-center justify-center overflow-hidden">
        {isCompleted && image.signed_url ? (
          <>
            <img
              src={image.signed_url}
              alt={`Resultado #${image.position}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Overlay Actions on Hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onPreview(image.signed_url!)}
                className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all transform hover:scale-110"
                title="Ampliar Imagem"
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all transform hover:scale-110"
                title="Baixar Imagem"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : isProcessing ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Sintetizando com Nano Banana...</p>
          </div>
        ) : isFailed ? (
          <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 text-rose-400">
            <AlertCircle className="w-8 h-8 opacity-80" />
            <p className="text-xs text-rose-300 max-w-[200px] line-clamp-2">
              {image.error_message || 'Falha na geração desta saída.'}
            </p>
          </div>
        ) : null}
      </div>

      {/* Card Actions Footer */}
      <div className="p-2.5 border-t border-surface-border bg-surface-card flex items-center justify-between gap-2">
        {isCompleted && (
          <button
            type="button"
            onClick={handleDownload}
            className="w-full py-1.5 px-3 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-xs text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar
          </button>
        )}

        {isFailed && onRetrySingle && (
          <button
            type="button"
            disabled={isRetrying}
            onClick={() => onRetrySingle(image.position)}
            className="w-full py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRetrying && "animate-spin")} />
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
};

