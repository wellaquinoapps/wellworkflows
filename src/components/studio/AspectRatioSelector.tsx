import React from 'react';
import { AspectRatio } from '@/types';
import { cn } from '@/lib/utils';
import { Smartphone, Monitor, Square } from 'lucide-react';

interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
  disabled?: boolean;
}

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const options: Array<{
    id: AspectRatio;
    label: string;
    description: string;
    icon: React.ElementType;
    previewBoxClass: string;
  }> = [
    {
      id: '9:16',
      label: '9:16 Vertical',
      description: 'Stories, Reels e Shorts',
      icon: Smartphone,
      previewBoxClass: 'w-3 h-5',
    },
    {
      id: '16:9',
      label: '16:9 Horizontal',
      description: 'Vídeos, Banners e Telas',
      icon: Monitor,
      previewBoxClass: 'w-5 h-3',
    },
    {
      id: '1:1',
      label: '1:1 Quadrada',
      description: 'Feed e E-commerce',
      icon: Square,
      previewBoxClass: 'w-4 h-4',
    },
  ];

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-300 block">
        Proporção de Saída
      </label>
      <div className="grid grid-cols-3 gap-2.5">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all flex flex-col items-start justify-between relative",
                isSelected
                  ? "bg-primary/10 border-primary text-white shadow-md shadow-primary/10"
                  : "bg-surface border-surface-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <Icon className={cn("w-4 h-4", isSelected ? "text-primary-light" : "text-slate-500")} />
                {/* Visual Ratio Box */}
                <div className="flex items-center justify-center w-6 h-6 rounded bg-black/40 border border-surface-border">
                  <div className={cn("rounded-[2px] bg-slate-400", isSelected && "bg-primary-light", opt.previewBoxClass)} />
                </div>
              </div>
              <div>
                <p className={cn("text-xs font-bold", isSelected ? "text-white" : "text-slate-300")}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

