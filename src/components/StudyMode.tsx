import { useState, useEffect, useCallback } from 'react';
import { supabase, Flashcard, Rating } from '../lib/supabase';
import { calculateNextReview, getDueCards } from '../lib/spaced-repetition';
import {
  ArrowLeft,
  Eye,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Minus,
  Smile,
  Meh,
  Frown,
  Loader2,
  CheckCircle2,
  PartyPopper
} from 'lucide-react';

type CardWithProgress = Flashcard & {
  showAnswer: boolean;
  isComplete: boolean;
};

export function StudyMode({
  deckId,
  onBack
}: {
  deckId: string;
  onBack: () => void;
}) {
  const [cards, setCards] = useState<CardWithProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ reviewed: 0, total: 0 });
  const [studyComplete, setStudyComplete] = useState(false);

  const fetchCards = useCallback(async () => {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .lte('next_review_at', new Date().toISOString());

    if (data && !error) {
      const dueCards = getDueCards(data).map((card) => ({
        ...card,
        showAnswer: false,
        isComplete: false
      }));
      setCards(dueCards);
      setStats({ reviewed: 0, total: dueCards.length });
    }
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const currentCard = cards[currentIndex];

  const showAnswer = () => {
    setCards((prev) =>
      prev.map((card, i) =>
        i === currentIndex ? { ...card, showAnswer: true } : card
      )
    );
  };

  const handleRating = async (rating: Rating) => {
    if (!currentCard) return;

    const updates = calculateNextReview(currentCard, rating);

    await supabase.from('flashcards').update({
      ease_factor: updates.ease_factor,
      interval: updates.interval,
      repetitions: updates.repetitions,
      next_review_at: updates.next_review_at.toISOString(),
      last_review_at: new Date().toISOString()
    }).eq('id', currentCard.id);

    await supabase.from('review_history').insert({
      flashcard_id: currentCard.id,
      rating
    });

    setCards((prev) =>
      prev.map((card, i) =>
        i === currentIndex ? { ...card, isComplete: true } : card
      )
    );

    setStats((prev) => ({ ...prev, reviewed: prev.reviewed + 1 }));

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setStudyComplete(true);
    }
  };

  const restartStudy = () => {
    setStudyComplete(false);
    setCurrentIndex(0);
    fetchCards();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">All caught up!</h2>
        <p className="text-slate-400 mb-6">No cards are due for review right now.</p>
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-lg bg-emerald-400/10 text-emerald-400 font-medium hover:bg-emerald-400/20 transition-colors"
        >
          Back to Deck
        </button>
      </div>
    );
  }

  if (studyComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 mb-6">
          <PartyPopper className="w-10 h-10 text-slate-900" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Great job!</h2>
        <p className="text-slate-400 mb-2">You reviewed {stats.reviewed} cards.</p>
        <p className="text-slate-500 text-sm mb-6">Keep up the great work!</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={restartStudy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700/50 text-white font-medium hover:bg-slate-700 border border-slate-600/50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Study Again
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 font-semibold hover:from-emerald-300 hover:to-cyan-300 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Exit Study Mode
      </button>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span className="text-sm text-slate-400">
            {Math.round((stats.reviewed / stats.total) * 100)}% complete
          </span>
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300"
            style={{ width: `${(stats.reviewed / stats.total) * 100}%` }}
          />
        </div>
      </div>

      <div className="relative">
        <div
          className={`bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden transition-all duration-300 ${
            currentCard?.showAnswer ? 'ring-2 ring-emerald-400/30' : ''
          }`}
        >
          <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
              {currentCard?.showAnswer ? 'Answer' : 'Question'}
            </div>
            <p className="text-xl text-white leading-relaxed">
              {currentCard?.showAnswer ? currentCard.back : currentCard?.front}
            </p>
          </div>

          {!currentCard?.showAnswer ? (
            <div className="p-6 border-t border-slate-700/50 flex justify-center">
              <button
                onClick={showAnswer}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 font-semibold hover:from-emerald-300 hover:to-cyan-300 transition-all"
              >
                <Eye className="w-5 h-5" />
                Show Answer
              </button>
            </div>
          ) : (
            <div className="p-6 border-t border-slate-700/50">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider text-center mb-4">
                How well did you know this?
              </div>
              <div className="grid grid-cols-6 gap-2">
                <button
                  onClick={() => handleRating(0)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Frown className="w-5 h-5" />
                  <span className="text-xs font-medium">Again</span>
                </button>
                <button
                  onClick={() => handleRating(1)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                >
                  <Meh className="w-5 h-5" />
                  <span className="text-xs font-medium">Hard</span>
                </button>
                <button
                  onClick={() => handleRating(2)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                >
                  <Minus className="w-5 h-5" />
                  <span className="text-xs font-medium">Weak</span>
                </button>
                <button
                  onClick={() => handleRating(3)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                >
                  <Meh className="w-5 h-5" />
                  <span className="text-xs font-medium">OK</span>
                </button>
                <button
                  onClick={() => handleRating(4)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Smile className="w-5 h-5" />
                  <span className="text-xs font-medium">Good</span>
                </button>
                <button
                  onClick={() => handleRating(5)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-xs font-medium">Easy</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-center text-slate-500 text-sm">
        <p>Rate your recall quality to schedule the next review</p>
        <p className="mt-1">Higher ratings = longer intervals between reviews</p>
      </div>
    </div>
  );
}
