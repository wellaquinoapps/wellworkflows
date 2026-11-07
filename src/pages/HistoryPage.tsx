import React, { useState, useEffect } from 'react';
import { History, Trash2, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Workflow } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

interface HistoryPageProps {
  onOpenWorkflow: (id: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenWorkflow }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setWorkflows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!deleteWorkflowId) return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        'https://dttgyctwfbennrsmodkn.supabase.co/functions/v1/delete-workflow',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ workflow_id: deleteWorkflowId }),
        }
      );

      if (res.ok) {
        setWorkflows(workflows.filter((w) => w.id !== deleteWorkflowId));
      }
      setDeleteWorkflowId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="border-b border-surface-border pb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          Histórico de Gerações
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Consulte e repita composições criadas anteriormente.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Carregando histórico...</div>
      ) : workflows.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border-2 border-dashed border-surface-border bg-surface/20">
          <History className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-300">Nenhum workflow registrado</p>
          <p className="text-xs text-slate-500 mt-1">Gere suas primeiras imagens no Estúdio.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="p-4 sm:p-5 rounded-2xl bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-600 transition-all group"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-primary-light transition-colors truncate">
                    {wf.name}
                  </h3>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded capitalize font-medium",
                      wf.status === 'completed' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                      wf.status === 'processing' && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse",
                      wf.status === 'failed' && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                      wf.status === 'draft' && "bg-slate-700/30 text-slate-400"
                    )}
                  >
                    {wf.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-1">{wf.prompt}</p>

                <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                  <span>Proporção: {wf.aspect_ratio}</span>
                  <span>Saídas: {wf.output_count}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(wf.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenWorkflow(wf.id)}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  Abrir no Estúdio <ArrowUpRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteWorkflowId(wf.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Excluir Workflow"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Workflow Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteWorkflowId)}
        title="Excluir Workflow"
        description="Tem certeza que deseja excluir este workflow? Todas as imagens geradas e arquivos de referência associados no Storage serão removidos de forma definitiva."
        confirmText="Excluir Definitivamente"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteWorkflow}
        onCancel={() => setDeleteWorkflowId(null)}
      />
    </div>
  );
};

