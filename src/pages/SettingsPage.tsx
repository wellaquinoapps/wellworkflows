import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw, 
  Layers,
  Activity,
  Gauge
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ApiCredential } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

export const SettingsPage: React.FC = () => {
  const [credentials, setCredentials] = useState<ApiCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [googleProjectRef, setGoogleProjectRef] = useState('');
  const [priority, setPriority] = useState(1);

  // Modals
  const [deleteModalCredId, setDeleteModalCredId] = useState<string | null>(null);

  // Quota checking state
  const [checkingQuotaIds, setCheckingQuotaIds] = useState<Record<string, boolean>>({});
  const [quotaResults, setQuotaResults] = useState<Record<string, {
    quotaStatus: 'available' | 'exhausted' | 'invalid';
    remainingPercentage: number;
    details: string;
    retryAfter?: string | null;
  }>>({});
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Try local backend proxy first, fallback to Supabase Edge Function
      const endpoint = '/api/manage-credentials?action=list';
      let res: Response;
      try {
        res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error('Local fallback');
      } catch {
        res = await fetch(
          'https://dttgyctwfbennrsmodkn.supabase.co/functions/v1/manage-api-credentials?action=list',
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar credenciais.');
      setCredentials(json.credentials || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao buscar credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !apiKey.trim()) {
      setErrorMessage('Informe um rótulo e a chave de API.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage('Criptografando chave com AES-256-GCM no servidor...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = {
        action: 'create',
        label: label.trim(),
        apiKey: apiKey.trim(),
        googleProjectRef: googleProjectRef.trim() || null,
        priority: Number(priority),
      };

      let res: Response;
      try {
        res = await fetch('/api/manage-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Local fallback');
      } catch {
        res = await fetch(
          'https://dttgyctwfbennrsmodkn.supabase.co/functions/v1/manage-api-credentials',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify(payload),
          }
        );
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar credencial.');

      setStatusMessage('Credencial criptografada e armazenada com sucesso!');
      setLabel('');
      setApiKey('');
      setGoogleProjectRef('');
      setShowAddForm(false);
      await loadCredentials();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao cadastrar chave.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleTestCredential = async (id: string) => {
    try {
      setStatusMessage('Testando conexão com a API Google Gemini...');
      const { data: { session } } = await supabase.auth.getSession();
      let res: Response;
      try {
        res = await fetch('/api/manage-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'test', id }),
        });
      } catch {
        res = await fetch(
          'https://dttgyctwfbennrsmodkn.supabase.co/functions/v1/manage-api-credentials',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ action: 'test', id }),
          }
        );
      }

      const json = await res.json();
      if (json.valid) {
        setStatusMessage('Chave validada com sucesso na API Google!');
      } else {
        setErrorMessage('Chave inválida ou não autorizada pela API do Google.');
      }
      await loadCredentials();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao testar chave.');
    }
  };

  const handleCheckQuota = async (id: string) => {
    setCheckingQuotaIds((prev) => ({ ...prev, [id]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/manage-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'check-quota', id }),
      });

      const json = await res.json();
      if (res.ok) {
        setQuotaResults((prev) => ({
          ...prev,
          [id]: {
            quotaStatus: json.quotaStatus,
            remainingPercentage: json.remainingPercentage,
            details: json.details,
            retryAfter: json.retryAfter,
          },
        }));
        await loadCredentials();
      }
    } catch (err: any) {
      console.error('Check quota error:', err);
    } finally {
      setCheckingQuotaIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleCheckAllQuotas = async () => {
    setIsCheckingAll(true);
    for (const cred of credentials) {
      await handleCheckQuota(cred.id);
    }
    setIsCheckingAll(false);
  };

  const handleDeleteCredential = async () => {
    if (!deleteModalCredId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      try {
        await fetch('/api/manage-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'delete', id: deleteModalCredId }),
        });
      } catch {
        await fetch(
          'https://dttgyctwfbennrsmodkn.supabase.co/functions/v1/manage-api-credentials',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ action: 'delete', id: deleteModalCredId }),
          }
        );
      }
      setDeleteModalCredId(null);
      await loadCredentials();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCredential = async (id: string, currentEnabled: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
        'https://dttgyctwfbennrsmodkn.supabase.co/functions/v1/manage-api-credentials',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'update',
            id,
            enabled: !currentEnabled,
            status: !currentEnabled ? 'active' : 'disabled',
          }),
        }
      );
      await loadCredentials();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" />
            Credenciais Google API (Nano Banana)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie múltiplas chaves Google para alternância automática e isolamento de cotas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {credentials.length > 0 && (
            <button
              type="button"
              disabled={isCheckingAll}
              onClick={handleCheckAllQuotas}
              className="px-4 py-2.5 bg-surface hover:bg-surface-card border border-surface-border text-slate-200 hover:text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Gauge className={cn("w-4 h-4 text-primary", isCheckingAll && "animate-spin")} />
              {isCheckingAll ? 'Verificando Todas...' : 'Verificar Cotas de Todas'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? 'Fechar Formulário' : 'Adicionar Chave'}
          </button>
        </div>
      </div>

      {/* Security Info Notice */}
      <div className="p-4 rounded-xl bg-surface border border-surface-border flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">Criptografia AES-256-GCM ponta a ponta</p>
          <p className="text-slate-400 leading-relaxed">
            Suas chaves são criptografadas antes da gravação no banco e nunca são expostas em texto puro.
            Várias chaves do <strong>mesmo projeto Google</strong> compartilham cotas; para ampliar capacidade, utilize credenciais de projetos Google distintos.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Add Credential Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateCredential}
          className="bg-surface border border-surface-border rounded-2xl p-6 space-y-4 shadow-xl animate-fade-in"
        >
          <h2 className="text-base font-semibold text-white">Cadastrar Nova Credencial Google</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Rótulo Identificador *
              </label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Gemini Produção 01"
                className="w-full px-3.5 py-2.5 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                ID do Projeto Google (Opcional)
              </label>
              <input
                type="text"
                value={googleProjectRef}
                onChange={(e) => setGoogleProjectRef(e.target.value)}
                placeholder="Ex: nano-banana-proj-prod"
                className="w-full px-3.5 py-2.5 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Google API Key *
              </label>
              <input
                type="password"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Prioridade (Maior = Primeiro)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Criptografando...' : 'Salvar com Criptografia'}
            </button>
          </div>
        </form>
      )}

      {/* Credentials List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Carregando credenciais...</div>
        ) : credentials.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border-2 border-dashed border-surface-border bg-surface/20">
            <Key className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma chave Google configurada</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Adicione sua primeira API Key para que o Nano Banana possa gerar as composições.
            </p>
          </div>
        ) : (
          credentials.map((cred) => (
            <div
              key={cred.id}
              className="p-4 sm:p-5 rounded-2xl bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-600"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-white">{cred.label}</span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded font-mono font-medium capitalize",
                      cred.status === 'active' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                      cred.status === 'cooldown' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                      cred.status === 'invalid' && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                      cred.status === 'disabled' && "bg-slate-700/30 text-slate-400"
                    )}
                  >
                    {cred.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                  <span>Chave: {cred.masked_key}</span>
                  {cred.google_project_ref && <span>Projeto: {cred.google_project_ref}</span>}
                  <span>Prioridade: {cred.priority}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={checkingQuotaIds[cred.id]}
                  onClick={() => handleCheckQuota(cred.id)}
                  className="px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-surface-border text-xs text-slate-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Consultar cota de consumo desta chave no Google"
                >
                  <Gauge className={cn("w-3.5 h-3.5 text-primary", checkingQuotaIds[cred.id] && "animate-spin")} />
                  {checkingQuotaIds[cred.id] ? 'Checando...' : 'Verificar Cota'}
                </button>

                <button
                  type="button"
                  onClick={() => handleTestCredential(cred.id)}
                  className="px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-surface-border text-xs text-slate-300 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Testar
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleCredential(cred.id, cred.enabled)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    cred.enabled
                      ? "bg-slate-800 text-slate-300 border-surface-border hover:bg-slate-700"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                  )}
                >
                  {cred.enabled ? 'Desativar' : 'Ativar'}
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteModalCredId(cred.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Excluir Chave"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Quota details card if checked */}
              {quotaResults[cred.id] && (
                <div className="w-full mt-2.5 pt-2.5 border-t border-surface-border/60">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      Cota Disponível:
                    </span>
                    <span className={cn(
                      "font-bold font-mono text-xs",
                      quotaResults[cred.id].remainingPercentage > 50 && "text-emerald-400",
                      quotaResults[cred.id].remainingPercentage <= 50 && quotaResults[cred.id].remainingPercentage > 0 && "text-amber-400",
                      quotaResults[cred.id].remainingPercentage === 0 && "text-rose-400"
                    )}>
                      {quotaResults[cred.id].remainingPercentage}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        quotaResults[cred.id].remainingPercentage > 50 && "bg-emerald-500",
                        quotaResults[cred.id].remainingPercentage <= 50 && quotaResults[cred.id].remainingPercentage > 0 && "bg-amber-500",
                        quotaResults[cred.id].remainingPercentage === 0 && "bg-rose-500"
                      )}
                      style={{ width: `${quotaResults[cred.id].remainingPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{quotaResults[cred.id].details}</span>
                    {quotaResults[cred.id].retryAfter && (
                      <span className="text-amber-400 font-mono text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Reinicia em: {quotaResults[cred.id].retryAfter}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete Credential Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteModalCredId)}
        title="Excluir Credencial Google"
        description="Tem certeza que deseja remover esta credencial de API? Ela será permanentemente apagada do servidor."
        confirmText="Excluir Credencial"
        isDestructive={true}
        onConfirm={handleDeleteCredential}
        onCancel={() => setDeleteModalCredId(null)}
      />
    </div>
  );
};

