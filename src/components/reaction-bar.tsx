'use client';

import { useState, useOptimistic, startTransition } from 'react';
import { ALLOWED_EMOJIS, type FeedReaction, type AllowedEmoji } from '@/lib/types';

interface ReactionBarProps {
  achievementId: string;
  reactions: FeedReaction[];
  onUpdate?: (reactions: FeedReaction[]) => void;
}

export function ReactionBar({ achievementId, reactions, onUpdate }: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [optimisticReactions, addOptimisticReaction] = useOptimistic(
    reactions,
    (state, action: { type: 'add' | 'remove'; emoji: string }) => {
      const existing = state.find((r) => r.emoji === action.emoji);

      if (action.type === 'add') {
        if (existing) {
          return state.map((r) =>
            r.emoji === action.emoji ? { ...r, count: r.count + 1, hasReacted: true } : r
          );
        }
        return [...state, { emoji: action.emoji, count: 1, hasReacted: true }];
      } else {
        if (existing && existing.count === 1) {
          return state.filter((r) => r.emoji !== action.emoji);
        }
        return state.map((r) =>
          r.emoji === action.emoji ? { ...r, count: r.count - 1, hasReacted: false } : r
        );
      }
    }
  );

  async function handleReaction(emoji: AllowedEmoji) {
    const existing = optimisticReactions.find((r) => r.emoji === emoji);
    const hasReacted = existing?.hasReacted || false;

    startTransition(() => {
      addOptimisticReaction({
        type: hasReacted ? 'remove' : 'add',
        emoji,
      });
    });

    setShowPicker(false);

    try {
      const response = await fetch('/api/reactions', {
        method: hasReacted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementId, emoji }),
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate?.(data.reactions);
      }
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {optimisticReactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReaction(reaction.emoji as AllowedEmoji)}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-all duration-200 active:scale-110 ${
            reaction.hasReacted
              ? 'border border-orange-200 bg-orange-100 text-orange-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
          aria-label="Add reaction"
        >
          +
        </button>

        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            {ALLOWED_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="rounded p-1 text-xl hover:bg-gray-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
