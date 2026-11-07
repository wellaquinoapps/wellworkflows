import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { StudioPage } from '@/pages/StudioPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'studio' | 'projects' | 'history' | 'settings'>('dashboard');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const handleOpenWorkflowInStudio = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setCurrentTab('studio');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Iniciando Nano Banana Studio...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLoginSuccess={() => setCurrentTab('dashboard')} />;
  }

  return (
    <AppLayout
      currentTab={currentTab}
      setCurrentTab={(tab) => {
        if (tab !== 'studio') setSelectedWorkflowId(null);
        setCurrentTab(tab);
      }}
      userEmail={session.user?.email}
      onLogout={handleLogout}
    >
      {currentTab === 'dashboard' && (
        <DashboardPage
          onNavigate={(tab) => setCurrentTab(tab)}
          onOpenWorkflow={handleOpenWorkflowInStudio}
        />
      )}

      {currentTab === 'studio' && (
        <StudioPage
          initialWorkflowId={selectedWorkflowId}
          onSavedWorkflow={() => setSelectedWorkflowId(null)}
        />
      )}

      {currentTab === 'projects' && (
        <ProjectsPage />
      )}

      {currentTab === 'history' && (
        <HistoryPage onOpenWorkflow={handleOpenWorkflowInStudio} />
      )}

      {currentTab === 'settings' && (
        <SettingsPage />
      )}
    </AppLayout>
  );
}

export default App;

