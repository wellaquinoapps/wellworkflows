import React, { useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

interface ImageInputNodeProps {
  id: string;
  data: {
    label: string;
    roleType: 'Cenário' | 'Produto' | 'Pessoa' | 'Referência de estilo';
    imageFile?: File;
    previewUrl?: string;
    onImageChange?: (id: string, file: File, roleType: any) => void;
    onRemove?: (id: string) => void;
    onRoleChange?: (id: string, roleType: any) => void;
  };
}

export const ImageInputNode: React.FC<ImageInputNodeProps> = ({ id, data }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      data.onImageChange?.(id, file, data.roleType);
    }
  };

  return (
    <div className="w-64 bg-surface-card/95 border-2 border-surface-border hover:border-primary/60 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md text-slate-100 font-sans transition-all">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-surface border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/20 text-primary-light flex items-center justify-center">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white tracking-wide">{data.label}</span>
        </div>
        {data.onRemove && (
          <button
            onClick={() => data.onRemove?.(id)}
            className="text-slate-500 hover:text-rose-400 p-0.5"
            title="Remover Nó"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Body Preview */}
      <div className="p-3 space-y-2.5">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative aspect-video w-full rounded-lg bg-black/60 border border-dashed border-surface-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden group transition-all"
        >
          {data.previewUrl ? (
            <>
              <img
                src={data.previewUrl}
                alt="Preview"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs text-white">
                Trocar imagem
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-primary transition-colors">
              <Upload className="w-5 h-5 mb-0.5" />
              <span className="text-xs font-medium">Carregar Imagem</span>
              <span className="text-[10px] text-slate-500">PNG, JPG, WebP</span>
            </div>
          )}
        </div>

        {/* Role Type Selector */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Papel no Workflow:</label>
          <select
            value={data.roleType}
            onChange={(e) => data.onRoleChange?.(id, e.target.value)}
            className="w-full px-2 py-1 bg-surface border border-surface-border rounded-md text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="Cenário">Cenário (Fundo)</option>
            <option value="Produto">Produto a Inserir</option>
            <option value="Pessoa">Pessoa</option>
            <option value="Referência de estilo">Referência de Estilo</option>
          </select>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFile}
        accept="image/*"
        className="hidden"
      />

      {/* Output Port Connection Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        className="!w-3 !h-3 !bg-primary !border-2 !border-surface-card !-right-1.5"
      />
    </div>
  );
};

