import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Trash2, Calendar, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ProjectsPageProps {
  onOpenProjectWorkflows?: (projectId: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [deleteProjId, setDeleteProjId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || null,
        })
        .select()
        .single();

      if (!error && data) {
        setProjects([data, ...projects]);
        setNewProjectName('');
        setNewProjectDesc('');
        setShowCreateModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteProjId) return;
    try {
      await supabase.from('projects').delete().eq('id', deleteProjId);
      setProjects(projects.filter((p) => p.id !== deleteProjId));
      setDeleteProjId(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-cyan-400" />
            Projetos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Organize suas composições e coleções de imagens.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Carregando projetos...</div>
      ) : projects.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border-2 border-dashed border-surface-border bg-surface/20">
          <FolderKanban className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-300">Nenhum projeto cadastrado</p>
          <p className="text-xs text-slate-500 mt-1">Crie seu primeiro projeto para agrupar workflows.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-surface border border-surface-border rounded-xl p-5 hover:border-slate-600 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-base group-hover:text-primary-light transition-colors">
                    {proj.name}
                  </h3>
                  <button
                    onClick={() => setDeleteProjId(proj.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Excluir Projeto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                  {proj.description || 'Sem descrição cadastrada.'}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-surface-border flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(proj.created_at).toLocaleDateString('pt-BR')}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Layers className="w-3.5 h-3.5" />
                  Workflows
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-surface-card border border-surface-border rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-bold text-white">Novo Projeto</h3>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Nome do Projeto *</label>
              <input
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Ex: Campanha Primavera 2026"
                className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Descrição</label>
              <textarea
                rows={3}
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Breve resumo sobre o projeto..."
                className="w-full px-3.5 py-2 bg-surface border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-surface-hover"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-lg shadow-primary/20"
              >
                Salvar Projeto
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteProjId)}
        title="Excluir Projeto"
        description="Tem certeza que deseja excluir este projeto? Workflows associados também serão removidos."
        confirmText="Excluir"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteProjId(null)}
      />
    </div>
  );
};

