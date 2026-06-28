import { useState, useEffect, useCallback } from 'react';
import { supabase, Deck } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  Plus,
  Trash2,
  BookOpen,
  Clock,
  ChevronRight,
  Loader2,
  X,
  Sparkles
} from 'lucide-react';
import { formatNextReview } from '../lib/spaced-repetition';

type DeckWithData = Deck & {
  card_count: number;
  due_count: number;
};

export function DeckList({ onSelectDeck }: { onSelectDeck: (deckId: string) => void }) {
  const { user } = useAuth();
  const [decks, setDecks] = useState<DeckWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDecks = useCallback(async () => {
    if (!user) return;

    const { data: decksData, error } = await supabase
      .from('decks')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching decks:', error);
      setLoading(false);
      return;
    }

    const decksWithCounts = await Promise.all(
      (decksData || []).map(async (deck) => {
        const { count: cardCount } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('deck_id', deck.id);

        const { count: dueCount } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('deck_id', deck.id)
          .lte('next_review_at', new Date().toISOString());

        return {
          ...deck,
          card_count: cardCount || 0,
          due_count: dueCount || 0
        };
      })
    );

    setDecks(decksWithCounts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim() || !user) return;

    setCreating(true);
    const { error } = await supabase.from('decks').insert({
      name: newDeckName.trim(),
      description: newDeckDescription.trim() || null
    });

    if (error) {
      console.error('Error creating deck:', error);
    } else {
      setNewDeckName('');
      setNewDeckDescription('');
      setShowCreateModal(false);
      fetchDecks();
    }
    setCreating(false);
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck and all its cards?')) return;

    setDeleting(deckId);
    const { error } = await supabase.from('decks').delete().eq('id', deckId);

    if (error) {
      console.error('Error deleting deck:', error);
    } else {
      fetchDecks();
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Decks</h2>
          <p className="text-slate-400 mt-1">{decks.length} decks total</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 font-semibold hover:from-emerald-300 hover:to-cyan-300 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Deck
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-700/50 mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No decks yet</h3>
          <p className="text-slate-400 mb-6">Create your first deck to start learning</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-400/10 text-emerald-400 font-medium hover:bg-emerald-400/20 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Create your first deck
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="group relative bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all overflow-hidden"
            >
              <button
                onClick={() => onSelectDeck(deck.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {deck.name}
                  </h3>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
                {deck.description && (
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{deck.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <BookOpen className="w-4 h-4" />
                    {deck.card_count} cards
                  </span>
                  {deck.due_count > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Clock className="w-4 h-4" />
                      {deck.due_count} due
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDeck(deck.id);
                }}
                disabled={deleting === deck.id}
                className="absolute top-3 right-3 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
              >
                {deleting === deck.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Create New Deck</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Deck Name
                </label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all"
                  placeholder="e.g., Spanish Vocabulary"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all resize-none"
                  placeholder="Brief description of what you'll learn"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                disabled={creating || !newDeckName.trim()}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 font-semibold hover:from-emerald-300 hover:to-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Deck
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
