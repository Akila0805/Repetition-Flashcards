import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Deck = {
  id: string;
  name: string;
  description: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  card_count?: number;
  due_count?: number;
};

export type Flashcard = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_at: string;
  last_review_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewHistory = {
  id: string;
  flashcard_id: string;
  user_id: string;
  rating: number;
  reviewed_at: string;
};

export type Rating = 0 | 1 | 2 | 3 | 4 | 5;
