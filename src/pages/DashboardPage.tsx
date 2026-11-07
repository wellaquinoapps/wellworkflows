import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  FolderKanban, 
  History, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Project, Workflow } from '@/types';
import { cn } from '@/lib/utils';

interface DashboardPageProps {
  onNavigate: (tab: 'studio' | 'projects' | 'history') => void;
  onOpenWorkflow: (workflowId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenWorkflow }) => {
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentWorkflows, setRecentWorkflows] = useState<Workflow[]>([]);
  const [totalImages, setTotalImages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch recent projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (projects) setRecentProjects(projects);

      // 2. Fetch recent workflows
      const { data: workflows } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (workflows) setRecentWorkflows(workflows);

      // 3. Count completed images
      const { count } = await supabase
        .from('workflow_images')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'result')
        .eq('status', 'completed');

      if (count !== null) setTotalImages(count);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-card via-surface to-surface-card border border-surface-border p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary-light">
            <Sparkles className="w-3.5 h-3.5" />
            Nano Banana Studio v1.0
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Composição Fotográfica com IA Google Gemini
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Insira produtos em cenários realistas com preservação de detalhes, rotação automática de credenciais e renderização em alta resolução.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('studio')}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Novo Estúdio de Criação
            </button>
            <button
              onClick={() => onNavigate('projects')}
              className="px-4 py-2.5 bg-surface-card hover:bg-surface-hover border border-surface-border text-slate-200 text-sm font-medium rounded-xl transition-all flex items-center gap-2"
            >
              <FolderKanban className="w-4 h-4 text-slate-400" />
              Ver Projetos
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-surface border border-surface-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total de Imagens Geradas</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalImages}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface border border-surface-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Projetos Ativos</p>
            <h3 className="text-2xl font-bold text-white mt-1">{recentProjects.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <FolderKanban className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface border border-surface-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Últimos Workflows</p>
            <h3 className="text-2xl font-bold text-white mt-1">{recentWorkflows.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Workflows & Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workflows */}
        <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Workflows Recentes
            </h2>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-primary-light hover:text-white flex items-center gap-1 transition-colors"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentWorkflows.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-surface-border rounded-xl">
              Nenhum workflow criado ainda. Crie seu primeiro no Estúdio.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentWorkflows.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => onOpenWorkflow(wf.id)}
                  className="p-3.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-surface-border transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-primary-light truncate transition-colors">
                      {wf.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{wf.prompt}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-surface border border-surface-border text-slate-400">
                      {wf.aspect_ratio}
                    </span>
                    <span className={cn(
                      "text-[11px] px-2 py-0.5 rounded capitalize",
                      wf.status === 'completed' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                      wf.status === 'processing' && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse",
                      wf.status === 'failed' && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                      wf.status === 'draft' && "bg-slate-700/30 text-slate-400"
                    )}>
                      {wf.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Projects */}
        <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-cyan-400" />
              Projetos
            </h2>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs text-primary-light hover:text-white flex items-center gap-1 transition-colors"
            >
              Gerenciar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-surface-border rounded-xl">
              Nenhum projeto registrado.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigate('projects')}
                  className="p-3.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-surface-border transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.description || 'Sem descrição'}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
