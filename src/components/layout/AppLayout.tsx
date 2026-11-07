import React from 'react';
import { 
  Sparkles, 
  FolderKanban, 
  History, 
  Settings, 
  LogOut, 
  User, 
  LayoutDashboard,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface AppLayoutProps {
  currentTab: 'dashboard' | 'studio' | 'projects' | 'history' | 'settings';
  setCurrentTab: (tab: 'dashboard' | 'studio' | 'projects' | 'history' | 'settings') => void;
  userEmail?: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  setCurrentTab,
  userEmail,
  onLogout,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'studio', label: 'Estúdio', icon: Sparkles },
    { id: 'projects', label: 'Projetos', icon: FolderKanban },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop Compact Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-surface-border bg-surface flex-shrink-0 z-30">
        <div className="p-5 border-b border-surface-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wide text-base">Nano Banana</h1>
            <p className="text-xs text-slate-400 font-mono">Image Studio</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-slate-400 hover:text-white hover:bg-surface-hover"
                )}
              >
                <Icon className={cn("w-5 h-5", active ? "text-white" : "text-slate-400")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-surface-border bg-surface-card/40">
          <div className="flex items-center justify-between p-2 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-surface-border flex items-center justify-center text-slate-300">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate max-w-[120px]">{userEmail || 'Admin'}</p>
                <span className="text-[10px] text-emerald-400 font-mono">conectado</span>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Encerrar sessão"
              aria-label="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-surface-border bg-surface sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-base">Nano Banana</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-20 md:pb-6 overflow-y-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-surface-border bg-surface/95 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around z-40 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors",
                active ? "text-primary font-semibold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "scale-110")} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Encerrar sessão"
        description="Tem certeza que deseja sair da sua conta no Nano Banana Studio?"
        confirmText="Sair da conta"
        isDestructive={true}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};

