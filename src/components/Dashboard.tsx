import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Activity, BookOpen, Clock, TrendingUp, Loader2 } from 'lucide-react';

type Stats = {
  totalCards: number;
  dueCards: number;
  reviewsToday: number;
  streakDays: number;
};

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalCards: 0,
    dueCards: 0,
    reviewsToday: 0,
    streakDays: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: totalCards } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .lte('next_review_at', new Date().toISOString());

    const { count: dueCards } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .lte('next_review_at', new Date().toISOString());

    const { count: reviewsToday } = await supabase
      .from('review_history')
      .select('*', { count: 'exact', head: true })
      .gte('reviewed_at', today.toISOString())
      .lt('reviewed_at', tomorrow.toISOString());

    const { data: reviewData } = await supabase
      .from('review_history')
      .select('reviewed_at')
      .order('reviewed_at', { ascending: false })
      .limit(100);

    let streakDays = 0;
    if (reviewData && reviewData.length > 0) {
      const daySet = new Set<string>();
      reviewData.forEach((r) => {
        const date = new Date(r.reviewed_at);
        date.setHours(0, 0, 0, 0);
        daySet.add(date.toISOString().split('T')[0]);
      });

      const sortedDays = Array.from(daySet).sort().reverse();
      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = new Date(today.setDate(today.getDate() - 1)).toISOString().split('T')[0];

      if (sortedDays[0] === todayStr || sortedDays[0] === yesterdayStr) {
        streakDays = 1;
        for (let i = 1; i < sortedDays.length; i++) {
          const prevDate = new Date(sortedDays[i - 1]);
          const currDate = new Date(sortedDays[i]);
          const diffDays = Math.floor(
            (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays === 1) {
            streakDays++;
          } else {
            break;
          }
        }
      }
    }

    setStats({
      totalCards: totalCards || 0,
      dueCards: dueCards || 0,
      reviewsToday: reviewsToday || 0,
      streakDays
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <BookOpen className="w-4 h-4" />
          <span className="text-sm">Total Cards</span>
        </div>
        <p className="text-2xl font-bold text-white">{stats.totalCards}</p>
      </div>
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Due for Review</span>
        </div>
        <p className="text-2xl font-bold text-amber-400">{stats.dueCards}</p>
      </div>
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <Activity className="w-4 h-4" />
          <span className="text-sm">Reviews Today</span>
        </div>
        <p className="text-2xl font-bold text-emerald-400">{stats.reviewsToday}</p>
      </div>
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm">Day Streak</span>
        </div>
        <p className="text-2xl font-bold text-cyan-400">{stats.streakDays}</p>
      </div>
    </div>
  );
}
