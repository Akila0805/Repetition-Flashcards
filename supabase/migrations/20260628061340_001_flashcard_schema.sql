/*
# Flashcard App Schema with Spaced Repetition

## Overview
This migration creates the core tables for a spaced repetition flashcard application.
Each user has their own decks and flashcards with isolated data access via RLS.

## Tables Created

### 1. `decks`
Stores flashcard deck/collection information.
- `id` (uuid, primary key) - unique identifier
- `name` (text, not null) - deck name
- `description` (text) - optional deck description
- `user_id` (uuid, not null, defaults to auth.uid()) - owner reference
- `created_at` (timestamptz) - creation timestamp
- `updated_at` (timestamptz) - last update timestamp

### 2. `flashcards`
Individual flashcards within decks.
- `id` (uuid, primary key) - unique identifier
- `deck_id` (uuid, not null) - parent deck reference
- `front` (text, not null) - front side content (question/prompt)
- `back` (text, not null) - back side content (answer)
- `ease_factor` (real, default 2.5) - SM-2 algorithm ease factor
- `interval` (integer, default 0) - days until next review
- `repetitions` (integer, default 0) - successful review count
- `next_review_at` (timestamptz) - scheduled next review date
- `last_review_at` (timestamptz) - last review date
- `created_at` (timestamptz) - creation timestamp
- `updated_at` (timestamptz) - last update timestamp

### 3. `review_history`
Tracks individual review sessions for analytics.
- `id` (uuid, primary key) - unique identifier
- `flashcard_id` (uuid, not null) - flashcard reviewed
- `user_id` (uuid, not null, defaults to auth.uid()) - reviewer
- `rating` (integer, not null) - quality rating (0-5, SM-2 scale)
- `reviewed_at` (timestamptz) - when the review occurred

## Security
- RLS enabled on all tables
- Owner-scoped policies: users can only access their own data
- Flashcards scoped through deck ownership

## Important Notes
1. The `user_id` column defaults to `auth.uid()` so inserts work without client-side owner assignment
2. Flashcard policies check deck ownership to ensure data isolation
3. Indexes optimize common queries (deck by user, flashcards by deck, due cards)
*/

-- Create decks table
CREATE TABLE IF NOT EXISTS decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  ease_factor real NOT NULL DEFAULT 2.5,
  interval integer NOT NULL DEFAULT 0,
  repetitions integer NOT NULL DEFAULT 0,
  next_review_at timestamptz DEFAULT now(),
  last_review_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create review_history table
CREATE TABLE IF NOT EXISTS review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 0 AND rating <= 5),
  reviewed_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(deck_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_review_history_user_id ON review_history(user_id);
CREATE INDEX IF NOT EXISTS idx_review_history_flashcard_id ON review_history(flashcard_id);

-- RLS Policies for decks (owner-scoped)
DROP POLICY IF EXISTS "select_own_decks" ON decks;
CREATE POLICY "select_own_decks" ON decks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_decks" ON decks;
CREATE POLICY "insert_own_decks" ON decks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_decks" ON decks;
CREATE POLICY "update_own_decks" ON decks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_decks" ON decks;
CREATE POLICY "delete_own_decks" ON decks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for flashcards (scoped through deck ownership)
DROP POLICY IF EXISTS "select_own_flashcards" ON flashcards;
CREATE POLICY "select_own_flashcards" ON flashcards FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM decks WHERE decks.id = flashcards.deck_id AND decks.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_flashcards" ON flashcards;
CREATE POLICY "insert_own_flashcards" ON flashcards FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM decks WHERE decks.id = flashcards.deck_id AND decks.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_flashcards" ON flashcards;
CREATE POLICY "update_own_flashcards" ON flashcards FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM decks WHERE decks.id = flashcards.deck_id AND decks.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM decks WHERE decks.id = flashcards.deck_id AND decks.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_flashcards" ON flashcards;
CREATE POLICY "delete_own_flashcards" ON flashcards FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM decks WHERE decks.id = flashcards.deck_id AND decks.user_id = auth.uid())
  );

-- RLS Policies for review_history (owner-scoped)
DROP POLICY IF EXISTS "select_own_reviews" ON review_history;
CREATE POLICY "select_own_reviews" ON review_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reviews" ON review_history;
CREATE POLICY "insert_own_reviews" ON review_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reviews" ON review_history;
CREATE POLICY "delete_own_reviews" ON review_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_decks_updated_at ON decks;
CREATE TRIGGER update_decks_updated_at
  BEFORE UPDATE ON decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flashcards_updated_at ON flashcards;
CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();