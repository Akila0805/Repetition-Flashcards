import { useState, useEffect, useCallback } from 'react';
import { supabase, Flashcard } from '../lib/supabase';
import { Deck } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Play,
  Loader2,
  X,
  Save,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formatNextReview } from '../lib/spaced-repetition';

export function FlashcardList({
  deckId,
  onBack,
  onStudy
}: {
  deckId: string;
  onBack: () => void;
  onStudy: () => void;
}) {
  const { user } = useAuth();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: deckData } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .maybeSingle();

    const { data: cardsData } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: false });

    setDeck(deckData);
    setCards(cardsData || []);
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    setSaving(true);
    const { error } = await supabase.from('flashcards').insert({
      deck_id: deckId,
      front: front.trim(),
      back: back.trim()
    });

    if (!error) {
      setFront('');
      setBack('');
      setShowCreateModal(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard || !front.trim() || !back.trim()) return;

    setSaving(true);
    const { error } = await supabase
      .from('flashcards')
      .update({ front: front.trim(), back: back.trim() })
      .eq('id', editingCard.id);

    if (!error) {
      setEditingCard(null);
      setFront('');
      setBack('');
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Delete this flashcard?')) return;

    setDeleting(cardId);
    await supabase.from('flashcards').delete().eq('id', cardId);
    fetchData();
    setDeleting(null);
  };

  const openEditModal = (card: Flashcard) => {
    setEditingCard(card);
    setFront(card.front);
    setBack(card.back);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingCard(null);
    setFront('');
    setBack('');
  };

  const dueCount = cards.filter((c) => new Date(c.next_review_at) <= new Date()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Decks
      </button>

      {deck && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">{deck.name}</h2>
          {deck.description && (
            <p className="text-slate-400">{deck.description}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        {cards.length > 0 && dueCount > 0 && (
          <button
            onClick={onStudy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 font-semibold hover:from-emerald-300 hover:to-cyan-300 transition-all"
          >
            <Play className="w-4 h-4" />
            Study ({dueCount} due)
          </button>
        )}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700/50 text-white font-medium hover:bg-slate-700 border border-slate-600/50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Card
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No flashcards yet</h3>
          <p className="text-slate-400 mb-6">Add your first card to start learning</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-400/10 text-emerald-400 font-medium hover:bg-emerald-400/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add your first card
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all overflow-hidden"
            >
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700/50">
                <div className="p-4">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Front
                  </div>
                  <p className="text-white">{card.front}</p>
                </div>
                <div className="p-4">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Back
                  </div>
                  <p className="text-white">{card.back}</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2 bg-slate-700/30 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="w-4 h-4" />
                  {formatNextReview(card.next_review_at)}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(card)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600/50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    disabled={deleting === card.id}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                  >
                    {deleting === card.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreateModal || editingCard) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingCard ? 'Edit Flashcard' : 'Create Flashcard'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editingCard ? handleUpdateCard : handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Front (Question)
                </label>
                <textarea
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all resize-none"
                  placeholder="e.g., What is the Spanish word for 'hello'?"
                  rows={3}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Back (Answer)
                </label>
                <textarea
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all resize-none"
                  placeholder="e.g., Hola"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                disabled={saving || !front.trim() || !back.trim()}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 font-semibold hover:from-emerald-300 hover:to-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingCard ? 'Update Card' : 'Create Card'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
