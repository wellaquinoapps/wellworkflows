import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Play, 
  RotateCcw, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  ChevronDown, 
  ChevronUp,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AspectRatio, LocalReferenceImage, Workflow, WorkflowImage } from '@/types';
import { ImageUploader } from '@/components/studio/ImageUploader';
import { AspectRatioSelector } from '@/components/studio/AspectRatioSelector';
import { GeneratedImageCard } from '@/components/studio/GeneratedImageCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface StudioPageProps {
  initialWorkflowId?: string | null;
  onSavedWorkflow?: () => void;
}

const COMPOSITION_SAMPLE_PROMPT = 
  "Insira o produto da segunda imagem no cenário da primeira. Preserve ao máximo formato, cores, textura, logotipo e detalhes do produto. Ajuste perspectiva, escala, iluminação e sombras para uma integração natural.";

const MULTI_PRODUCT_SAMPLE_PROMPT =
  "Insira os produtos das imagens 2 e 3 no cenário da imagem 1. Preserve com máxima fidelidade os logotipos, formatos, texturas e cores de cada produto. Posicione-os de forma harmoniosa no ambiente, ajustando escala, iluminação, reflexos e sombras de contato realistas.";

export const StudioPage: React.FC<StudioPageProps> = ({ initialWorkflowId }) => {
  // Workflow Form State
  const [workflowName, setWorkflowName] = useState('Novo Workflow');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [outputCount, setOutputCount] = useState<number>(4);
  const [referenceImages, setReferenceImages] = useState<LocalReferenceImage[]>([]);
  const [individualPrompts, setIndividualPrompts] = useState<string[]>(['', '', '', '']);
  const [showIndividualPrompts, setShowIndividualPrompts] = useState(false);

  // Active Workflow & Generation State
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(initialWorkflowId || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResults, setGenerationResults] = useState<WorkflowImage[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Full Screen Image Preview Modal
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // Confirmation Modals
  const [confirmClearModal, setConfirmClearModal] = useState(false);

  useEffect(() => {
    if (initialWorkflowId) {
      loadExistingWorkflow(initialWorkflowId);
    }
  }, [initialWorkflowId]);

  const loadExistingWorkflow = async (id: string) => {
    try {
      const { data: wf, error: wfErr } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .single();

      if (wfErr || !wf) return;

      setActiveWorkflowId(wf.id);
      setWorkflowName(wf.name);
      setPrompt(wf.prompt);
      setAspectRatio(wf.aspect_ratio);
      setOutputCount(wf.output_count);

      // Fetch images
      refreshWorkflowStatus(wf.id);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshWorkflowStatus = async (workflowId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://dttgyctwfbennrsmodkn.supabase.co/functions/v1/get-generation-status?workflow_id=${workflowId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (res.ok) {
        const json = await res.json();
        const results = (json.images || []).filter((img: any) => img.role === 'result');
        setGenerationResults(results);
      }
    } catch (err) {
      console.error('Error refreshing status:', err);
    }
  };

  // Add Local Image
  const handleAddImage = (file: File) => {
    const newImage: LocalReferenceImage = {
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      roleType: referenceImages.length === 0 ? 'Cenário' : 'Produto',
      position: referenceImages.length + 1,
    };
    setReferenceImages((prev) => [...prev, newImage]);
  };

  const handleRemoveImage = (id: string) => {
    setReferenceImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleUpdateRole = (id: string, role: LocalReferenceImage['roleType']) => {
    setReferenceImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, roleType: role } : img))
    );
  };

  // Start Generation
  const handleGenerate = async (retryFailedOnly = false) => {
    if (!prompt.trim()) {
      setErrorMessage('Por favor, informe o prompt principal.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setStatusMessage('Preparando referências e salvando workflow...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada. Faça login novamente.');

      // 1. Get or create a default project if none exists
      let projectId: string;
      const { data: projects } = await supabase.from('projects').select('id').limit(1);
      if (projects && projects.length > 0) {
        projectId = projects[0].id;
      } else {
        const { data: newProj, error: pErr } = await supabase
          .from('projects')
          .insert({ user_id: user.id, name: 'Projeto Geral' })
          .select()
          .single();
        if (pErr) throw pErr;
        projectId = newProj.id;
      }

      // 2. Create or Update Workflow in Supabase
      let currentWfId = activeWorkflowId;
      if (!currentWfId) {
        const { data: wf, error: wfError } = await supabase
          .from('workflows')
          .insert({
            project_id: projectId,
            user_id: user.id,
            name: workflowName.trim(),
            prompt: prompt.trim(),
            aspect_ratio: aspectRatio,
            output_count: outputCount,
            status: 'queued',
          })
          .select()
          .single();

        if (wfError) throw wfError;
        currentWfId = wf.id;
        setActiveWorkflowId(wf.id);
      } else {
        await supabase
          .from('workflows')
          .update({
            name: workflowName.trim(),
            prompt: prompt.trim(),
            aspect_ratio: aspectRatio,
            output_count: outputCount,
            status: 'queued',
          })
          .eq('id', currentWfId);
      }

      // 3. Upload Reference Images to Storage & insert into workflow_images
      if (referenceImages.length > 0 && !retryFailedOnly) {
        setStatusMessage('Enviando imagens de referência para o Storage seguro...');
        for (const ref of referenceImages) {
          if (ref.file) {
            const ext = ref.file.name.split('.').pop() || 'png';
            const storagePath = `${user.id}/${currentWfId}/ref_${ref.position}_${Date.now()}.${ext}`;

            const { error: upErr } = await supabase.storage
              .from('image-references')
              .upload(storagePath, ref.file, { upsert: true });

            if (upErr) {
              console.warn('Storage upload error:', upErr);
            }

            await supabase.from('workflow_images').insert({
              workflow_id: currentWfId,
              user_id: user.id,
              role: 'reference',
              position: ref.position,
              storage_path: storagePath,
              mime_type: ref.file.type || 'image/jpeg',
              file_size: ref.file.size,
              prompt: ref.roleType,
            });
          }
        }
      }

      // 4. Trigger Edge Function 'generate-images'
      setStatusMessage('Acionando Google Gemini (Nano Banana) com rotação de chaves...');
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        'https://dttgyctwfbennrsmodkn.supabase.co/functions/v1/generate-images',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            workflow_id: currentWfId,
            individual_prompts: showIndividualPrompts ? individualPrompts : [],
            retry_failed_only: retryFailedOnly,
          }),
        }
      );

      const resultData = await response.json();

      if (!response.ok) {
        throw new Error(resultData.error || 'Erro na execução da geração.');
      }

      setStatusMessage('Geração concluída! Carregando resultados...');
      if (currentWfId) {
        await refreshWorkflowStatus(currentWfId);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado durante a geração.');
    } finally {
      setIsGenerating(false);
      setStatusMessage(null);
    }
  };

  const handleRetrySingle = async (pos: number) => {
    await handleGenerate(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-xl sm:text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Estúdio privado • Alternância automática de cotas Google ativada
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmClearModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-surface-hover border border-surface-border transition-colors"
          >
            Limpar tela
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {statusMessage && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm flex items-center gap-3 animate-pulse">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Control Column (Inputs) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Reference Images Component */}
          <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-sm">
            <ImageUploader
              images={referenceImages}
              onAddImage={handleAddImage}
              onRemoveImage={handleRemoveImage}
              onUpdateRole={handleUpdateRole}
              maxImages={4}
            />
          </div>

          {/* Prompt Section */}
          <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Instrução Principal (Prompt)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPrompt(MULTI_PRODUCT_SAMPLE_PROMPT)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline transition-colors"
                >
                  Exemplo: 1 Cenário + 2 Produtos
                </button>
                <button
                  type="button"
                  onClick={() => setPrompt(COMPOSITION_SAMPLE_PROMPT)}
                  className="text-xs text-primary-light hover:text-white underline transition-colors"
                >
                  Exemplo: 1 Cenário + 1 Produto
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva a composição desejada ou copie o exemplo acima..."
              className="w-full p-3.5 bg-surface-card border border-surface-border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />

            {/* Collapsible Individual Prompts */}
            <div className="border-t border-surface-border pt-3">
              <button
                type="button"
                onClick={() => setShowIndividualPrompts(!showIndividualPrompts)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                {showIndividualPrompts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Instruções individuais por saída (opcional)
              </button>

              {showIndividualPrompts && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 animate-fade-in">
                  {[0, 1, 2, 3].slice(0, outputCount).map((idx) => (
                    <div key={idx}>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Instrução para Saída #{idx + 1}:
                      </label>
                      <input
                        type="text"
                        value={individualPrompts[idx] || ''}
                        onChange={(e) => {
                          const updated = [...individualPrompts];
                          updated[idx] = e.target.value;
                          setIndividualPrompts(updated);
                        }}
                        placeholder={`Variação para saída ${idx + 1}...`}
                        className="w-full px-3 py-1.5 bg-surface-card border border-surface-border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aspect Ratio & Quantity */}
          <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-5 shadow-sm">
            <AspectRatioSelector
              value={aspectRatio}
              onChange={setAspectRatio}
              disabled={isGenerating}
            />

            <div className="border-t border-surface-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300">
                  Quantidade de Saídas
                </label>
                <span className="text-xs font-mono font-bold text-primary-light">
                  {outputCount} {outputCount === 1 ? 'imagem' : 'imagens'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setOutputCount(count)}
                    disabled={isGenerating}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      outputCount === count
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-surface-card text-slate-400 border-surface-border hover:bg-surface-hover hover:text-white'
                    }`}
                  >
                    {count} {count === 1 ? 'Saída' : 'Saídas'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Cada saída é processada de forma independente pelo Nano Banana.
              </p>
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleGenerate(false)}
            className="w-full py-4 px-6 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-base"
          >
            {isGenerating ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando no Google Gemini...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar {outputCount} {outputCount === 1 ? 'Imagem' : 'Imagens'}
              </>
            )}
          </button>
        </div>

        {/* Right Output Column (Results) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Painel de Resultados
            </h3>
            {activeWorkflowId && (
              <button
                type="button"
                onClick={() => refreshWorkflowStatus(activeWorkflowId)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Atualizar
              </button>
            )}
          </div>

          {generationResults.length === 0 && !isGenerating ? (
            <div className="h-96 rounded-2xl border-2 border-dashed border-surface-border bg-surface/30 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-border flex items-center justify-center text-slate-500">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">Nenhuma imagem gerada ainda</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Configure as referências, defina o prompt e clique em Gerar para ver os resultados aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {generationResults.map((img) => (
                <GeneratedImageCard
                  key={img.id || img.position}
                  image={img}
                  onPreview={(url) => setPreviewModalUrl(url)}
                  onRetrySingle={handleRetrySingle}
                  isRetrying={isGenerating}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Preview Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-surface-border">
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewModalUrl}
              alt="Preview ampliado"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Confirm Clear Modal */}
      <ConfirmDialog
        isOpen={confirmClearModal}
        title="Limpar estúdio"
        description="Deseja limpar todos os campos e referências atuais? Dados não salvos serão descartados."
        confirmText="Limpar tudo"
        isDestructive={true}
        onConfirm={() => {
          setConfirmClearModal(false);
          setPrompt('');
          setReferenceImages([]);
          setGenerationResults([]);
          setActiveWorkflowId(null);
          setWorkflowName('Novo Workflow');
        }}
        onCancel={() => setConfirmClearModal(false)}
      />
    </div>
  );
};
