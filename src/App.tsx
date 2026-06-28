import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthForm } from './components/Auth';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DeckList } from './components/DeckList';
import { FlashcardList } from './components/FlashcardList';
import { StudyMode } from './components/StudyMode';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

type View = 'decks' | 'cards' | 'study';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('decks');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setView('cards');
  };

  const handleBackToDecks = () => {
    setSelectedDeckId(null);
    setView('decks');
  };

  const handleStartStudy = () => {
    setView('study');
  };

  const handleExitStudy = () => {
    setView('cards');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'decks' && (
          <>
            <Dashboard />
            <DeckList onSelectDeck={handleSelectDeck} />
          </>
        )}
        {view === 'cards' && selectedDeckId && (
          <FlashcardList
            deckId={selectedDeckId}
            onBack={handleBackToDecks}
            onStudy={handleStartStudy}
          />
        )}
        {view === 'study' && selectedDeckId && (
          <StudyMode deckId={selectedDeckId} onBack={handleExitStudy} />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
