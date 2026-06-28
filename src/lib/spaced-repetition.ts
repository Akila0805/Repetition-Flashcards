import { Flashcard, Rating } from './supabase';

/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Rating scale:
 * 0 - Complete blackout (forgot completely)
 * 1 - Incorrect, but remembered after seeing answer
 * 2 - Incorrect, but answer seemed familiar
 * 3 - Correct with difficulty (hesitated)
 * 4 - Correct with some hesitation
 * 5 - Perfect response (immediate, confident)
 */

export function calculateNextReview(
  card: Flashcard,
  rating: Rating
): { interval: number; ease_factor: number; repetitions: number; next_review_at: Date } {
  let { ease_factor, interval, repetitions } = card;

  // If rating is below 3, reset repetitions
  if (rating < 3) {
    repetitions = 0;
    interval = 1; // Review again tomorrow
  } else {
    // Successful recall
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease_factor);
    }
  }

  // Update ease factor using SM-2 formula
  ease_factor = Math.max(
    1.3,
    ease_factor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  );

  const next_review_at = new Date();
  next_review_at.setDate(next_review_at.getDate() + interval);
  next_review_at.setHours(0, 0, 0, 0);

  return { interval, ease_factor, repetitions, next_review_at };
}

export function getDueCards(cards: Flashcard[]): Flashcard[] {
  const now = new Date();
  return cards
    .filter(card => new Date(card.next_review_at) <= now)
    .sort((a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime());
}

export function getReviewStatus(card: Flashcard): 'new' | 'learning' | 'review' {
  if (card.repetitions === 0 && card.interval === 0) {
    return 'new';
  }
  if (card.interval <= 1) {
    return 'learning';
  }
  return 'review';
}

export function formatNextReview(date: string | null): string {
  if (!date) return 'Not reviewed yet';

  const reviewDate = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Due now';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays} days`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;
  if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months`;
  return `${Math.ceil(diffDays / 365)} years`;
}
