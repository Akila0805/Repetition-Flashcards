import { useAuth } from '../hooks/useAuth';
import { Brain, LogOut, User } from 'lucide-react';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400">
            <Brain className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">FlashMind</h1>
            <p className="text-xs text-slate-400">Spaced Repetition</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-slate-400 text-sm">
            <User className="w-4 h-4" />
            <span className="max-w-[150px] truncate">{user?.email}</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
