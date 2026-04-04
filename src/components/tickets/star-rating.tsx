"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { rateTicket } from "@/lib/tickets/actions";

interface StarRatingProps {
  ticketId: string;
  currentScore: number | null;
}

export function StarRating({ ticketId, currentScore }: StarRatingProps) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(currentScore);

  if (score !== null) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground mr-2">Your rating:</span>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`h-5 w-5 ${i <= score ? "fill-gold text-gold" : "text-cream-400"}`} />
        ))}
      </div>
    );
  }

  async function handleRate(value: number) {
    setSubmitting(true);
    try {
      await rateTicket(ticketId, value);
      setScore(value);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg bg-gold-50 p-4">
      <p className="text-sm font-medium text-foreground mb-2">How was your experience?</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            disabled={submitting}
            onMouseEnter={() => setHoveredStar(i)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleRate(i)}
            className="disabled:opacity-50"
          >
            <Star className={`h-7 w-7 transition-colors ${i <= hoveredStar ? "fill-gold text-gold" : "text-cream-400 hover:text-gold-300"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
