import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { LocalReferenceImage } from '@/types';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  images: LocalReferenceImage[];
  onAddImage: (file: File) => void;
  onRemoveImage: (id: string) => void;
  onUpdateRole: (id: string, role: LocalReferenceImage['roleType']) => void;
  maxImages?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onAddImage,
  onRemoveImage,
  onUpdateRole,
  maxImages = 4,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        if (images.length < maxImages) {
          if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            onAddImage(file);
          } else {
            alert('Formato não suportado. Por favor, utilize JPEG, PNG ou WebP.');
          }
        }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        if (images.length < maxImages && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          onAddImage(file);
        }
      });
    }
  };

  const roles: LocalReferenceImage['roleType'][] = [
    'Cenário',
    'Produto',
    'Pessoa',
    'Referência de estilo',
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            Imagens de Referência
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Adicione até {maxImages} imagens. Exemplo: Imagem 1 = Cenário, Imagem 2 = Produto.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-surface px-2.5 py-1 rounded-lg border border-surface-border">
          {images.length} / {maxImages}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {images.map((img, idx) => (
          <div
            key={img.id}
            className="relative bg-surface rounded-xl border border-surface-border overflow-hidden flex flex-col group transition-all hover:border-slate-600"
          >
            <div className="relative aspect-square w-full bg-black/40 overflow-hidden">
              <img
                src={img.previewUrl}
                alt={`Referência ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-white">
                #{idx + 1}
              </div>
              <button
                type="button"
                onClick={() => onRemoveImage(img.id)}
                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 text-slate-300 hover:text-rose-400 transition-colors"
                title="Remover imagem"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-2 border-t border-surface-border bg-surface-card">
              <label className="text-[10px] text-slate-400 block mb-1">Papel da imagem:</label>
              <select
                value={img.roleType}
                onChange={(e) => onUpdateRole(img.id, e.target.value as any)}
                className="w-full bg-surface border border-surface-border rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {images.length < maxImages && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "aspect-square rounded-xl border-2 border-dashed border-surface-border hover:border-primary/60 bg-surface/40 hover:bg-surface flex flex-col items-center justify-center p-4 cursor-pointer transition-all text-center group",
              images.length === 0 && "col-span-2 sm:col-span-4 aspect-auto py-8"
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-surface-border flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-300 group-hover:text-white">
              {images.length === 0 ? 'Clique ou arraste imagens aqui' : 'Adicionar foto'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">JPEG, PNG ou WebP (até 15MB)</p>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
      />
    </div>
  );
};

