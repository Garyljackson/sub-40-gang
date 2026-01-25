'use client';

import { useState, useCallback } from 'react';
import { AchievementCard } from './achievement-card';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';
import type { FeedAchievement, FeedReaction, FeedResponse } from '@/lib/types';

interface FeedListProps {
  initialData: FeedResponse;
}

export function FeedList({ initialData }: FeedListProps) {
  const [achievements, setAchievements] = useState<FeedAchievement[]>(initialData.achievements);
  const [cursor, setCursor] = useState<string | null>(initialData.nextCursor);
  const [hasMore, setHasMore] = useState(initialData.hasMore);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !cursor) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`);
      if (response.ok) {
        const data: FeedResponse = await response.json();
        setAchievements((prev) => [...prev, ...data.achievements]);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load more achievements:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, cursor]);

  const handleReactionUpdate = useCallback((achievementId: string, reactions: FeedReaction[]) => {
    setAchievements((prev) => prev.map((a) => (a.id === achievementId ? { ...a, reactions } : a)));
  }, []);

  if (achievements.length === 0) {
    return (
      <EmptyState
        message="No achievements yet"
        description="When you or your crew unlocks a milestone, it will appear here!"
      />
    );
  }

  return (
    <div className="space-y-4">
      {achievements.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
          onReactionUpdate={handleReactionUpdate}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center py-4">
          <Button variant="secondary" onClick={loadMore} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
