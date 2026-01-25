'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { FeedAchievement, FeedReaction } from '@/lib/types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Tables } from '@/lib/supabase';

interface UseFeedSubscriptionOptions {
  currentMemberId: string;
  season: number;
  onNewAchievement: (achievement: FeedAchievement) => void;
  onReactionUpdate: (achievementId: string, reactions: FeedReaction[]) => void;
  enabled?: boolean;
}

interface UseFeedSubscriptionResult {
  isConnected: boolean;
  error: Error | null;
}

export function useFeedSubscription({
  currentMemberId,
  season,
  onNewAchievement,
  onReactionUpdate,
  enabled = true,
}: UseFeedSubscriptionOptions): UseFeedSubscriptionResult {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Use refs for callbacks to avoid re-subscribing when callbacks change
  const onNewAchievementRef = useRef(onNewAchievement);
  const onReactionUpdateRef = useRef(onReactionUpdate);

  useEffect(() => {
    onNewAchievementRef.current = onNewAchievement;
  }, [onNewAchievement]);

  useEffect(() => {
    onReactionUpdateRef.current = onReactionUpdate;
  }, [onReactionUpdate]);

  const fetchAchievement = useCallback(
    async (achievementId: string): Promise<FeedAchievement | null> => {
      try {
        const response = await fetch(`/api/achievements/${achievementId}`);
        if (response.ok) {
          const data = await response.json();
          return data.achievement;
        }
      } catch (err) {
        console.error('Failed to fetch achievement:', err);
      }
      return null;
    },
    []
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleAchievementInsert = async (
      payload: RealtimePostgresChangesPayload<Tables<'achievements'>>
    ) => {
      if (payload.eventType !== 'INSERT') return;

      const newRecord = payload.new;
      if (!newRecord || newRecord.season !== season) return;

      const achievement = await fetchAchievement(newRecord.id);
      if (achievement) {
        onNewAchievementRef.current(achievement);
      }
    };

    const handleReactionChange = async (
      payload: RealtimePostgresChangesPayload<Tables<'reactions'>>
    ) => {
      const achievementId = (
        payload.eventType === 'DELETE' ? payload.old?.achievement_id : payload.new?.achievement_id
      ) as string | undefined;

      if (!achievementId) return;

      const achievement = await fetchAchievement(achievementId);
      if (achievement) {
        onReactionUpdateRef.current(achievementId, achievement.reactions);
      }
    };

    const channel = supabase
      .channel(`feed-realtime-${currentMemberId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'achievements',
        },
        handleAchievementInsert
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
        },
        handleReactionChange
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError(err || new Error('Channel error'));
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setError(new Error('Connection timed out'));
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, currentMemberId, season, fetchAchievement]);

  return { isConnected, error };
}
