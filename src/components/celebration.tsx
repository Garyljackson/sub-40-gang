'use client';

import { useEffect, useMemo, useRef } from 'react';

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  color: string;
}

const COLORS = ['#f97316', '#eab308', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6'];

function generatePieces(): ConfettiPiece[] {
  return Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#10b981',
  }));
}

export function Celebration({ show, onComplete }: { show: boolean; onComplete?: () => void }) {
  const onCompleteRef = useRef(onComplete);

  const pieces = useMemo(() => (show ? generatePieces() : []), [show]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!show) return;

    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 3500);

    return () => clearTimeout(timer);
  }, [show]);

  if (!show) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="animate-confetti absolute h-3 w-3 rounded-sm"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
