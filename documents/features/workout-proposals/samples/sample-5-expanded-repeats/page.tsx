'use client';

import { useState, useCallback } from 'react';
import { useVoting } from '../shared/use-voting';
import { MOCK_PROPOSALS, MOCK_CURRENT_USER, MOCK_ARCHIVED } from '../shared/mock-data';
import { VOTING_PERIOD, PACE_RANGES, REST_TYPE_LABELS } from '../shared/constants';
import type {
  WorkoutProposal,
  ArchivedWorkout,
  Segment,
  PaceRange,
  RestType,
  Workout,
} from '../shared/types';
import {
  getSegmentColor,
  getSegmentSummary,
  formatRelativeTime,
  calculateWorkoutDuration,
  formatTotalDuration,
} from '../shared/utils';

// ============================================================================
// Sample 5: Expanded Repeats Layout
// Design: Repeat contents are always visible as nested boxes
// ============================================================================

export default function Sample5ExpandedRepeatsPage() {
  const [activeTab, setActiveTab] = useState<'proposals' | 'history'>('proposals');
  const [showBuilder, setShowBuilder] = useState(false);
  const [customProposals, setCustomProposals] = useState<WorkoutProposal[]>([]);

  const { proposals, vote, unvote } = useVoting({
    initialProposals: [...MOCK_PROPOSALS, ...customProposals],
    currentUser: MOCK_CURRENT_USER,
  });

  const handleSubmitWorkout = useCallback((workout: Workout) => {
    const newProposal: WorkoutProposal = {
      id: `proposal-custom-${Date.now()}`,
      workout,
      proposer: MOCK_CURRENT_USER,
      voteCount: 0,
      hasVoted: false,
      createdAt: new Date().toISOString(),
    };
    setCustomProposals((prev) => [...prev, newProposal]);
    setShowBuilder(false);
  }, []);

  // Combine and sort all proposals
  const allProposals = [
    ...proposals,
    ...customProposals.filter((cp) => !proposals.some((p) => p.id === cp.id)),
  ].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Workouts</h1>
            <p className="text-sm text-gray-500">{VOTING_PERIOD.displayDate}</p>
          </div>
          <button
            onClick={() => setShowBuilder(true)}
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-600"
          >
            + Propose
          </button>
        </div>
      </header>

      {/* Tab Toggle */}
      <div className="flex gap-2 border-b border-gray-200 bg-white px-4">
        <button
          onClick={() => setActiveTab('proposals')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'proposals'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'proposals' ? (
          <div className="space-y-4">
            {allProposals.length === 0 ? (
              <div className="rounded-xl bg-white py-12 text-center shadow-sm">
                <p className="text-gray-500">No proposals yet this week.</p>
              </div>
            ) : (
              allProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  isOwnProposal={proposal.proposer.id === MOCK_CURRENT_USER.id}
                  onVote={() => (proposal.hasVoted ? unvote(proposal.id) : vote(proposal.id))}
                />
              ))
            )}
          </div>
        ) : (
          <ArchiveSection archives={MOCK_ARCHIVED} />
        )}
      </div>

      {/* Builder Modal */}
      {showBuilder && (
        <WorkoutBuilder onClose={() => setShowBuilder(false)} onSubmit={handleSubmitWorkout} />
      )}
    </div>
  );
}

// ============================================================================
// Proposal Card Component
// ============================================================================

interface ProposalCardProps {
  proposal: WorkoutProposal;
  isOwnProposal: boolean;
  onVote: () => void;
}

function ProposalCard({ proposal, isOwnProposal, onVote }: ProposalCardProps) {
  const duration = calculateWorkoutDuration(proposal.workout.segments);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={proposal.proposer.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-gray-900">{proposal.proposer.name}</p>
              <span className="text-sm text-gray-400">
                {formatRelativeTime(proposal.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-500">proposed a workout</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Workout Title */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{proposal.workout.name}</h3>
          <p className="text-sm text-gray-500">{formatTotalDuration(duration)}</p>
        </div>

        {/* Expanded Timeline */}
        <ExpandedTimeline segments={proposal.workout.segments} />

        {/* Notes */}
        {proposal.workout.notes && (
          <p className="text-sm text-gray-600">{proposal.workout.notes}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">👍</span>
          <span className="font-medium text-gray-700">
            {proposal.voteCount} {proposal.voteCount === 1 ? 'vote' : 'votes'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isOwnProposal && (
            <>
              <button className="rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100">
                Edit
              </button>
              <button className="rounded-lg px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50">
                Delete
              </button>
            </>
          )}
          <button
            onClick={onVote}
            className={`min-w-[100px] rounded-lg px-4 py-2 font-medium transition-colors ${
              proposal.hasVoted
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {proposal.hasVoted ? 'Voted ✓' : 'Vote'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Expanded Timeline - Shows repeat contents as nested boxes
// ============================================================================

interface ExpandedTimelineProps {
  segments: Segment[];
}

function ExpandedTimeline({ segments }: ExpandedTimelineProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {segments.map((segment) => (
        <SegmentBlock key={segment.id} segment={segment} />
      ))}
    </div>
  );
}

interface SegmentBlockProps {
  segment: Segment;
  nested?: boolean;
}

function SegmentBlock({ segment, nested = false }: SegmentBlockProps) {
  const color = getSegmentColor(segment);
  const summary = getSegmentSummary(segment);

  // Size classes based on nesting level
  const sizeClass = nested ? 'min-h-[40px] px-2 py-1' : 'min-h-[56px] px-3 py-2';
  const textSize = nested ? 'text-xs' : 'text-sm';

  if (segment.type === 'repeat') {
    return (
      <div className="flex flex-col rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-2">
        {/* Repeat Header */}
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">
            {segment.count}×
          </span>
          <span className="text-xs text-gray-500">repeat</span>
        </div>

        {/* Nested Segments - shown as boxes */}
        <div className="flex flex-wrap gap-1.5">
          {segment.segments.map((nestedSegment) => (
            <SegmentBlock key={nestedSegment.id} segment={nestedSegment} nested={true} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-lg ${color} ${sizeClass}`}>
      <span className={`font-medium text-gray-700 ${textSize}`}>{summary}</span>
    </div>
  );
}

// ============================================================================
// Archive Section
// ============================================================================

interface ArchiveSectionProps {
  archives: ArchivedWorkout[];
}

function ArchiveSection({ archives }: ArchiveSectionProps) {
  if (archives.length === 0) {
    return (
      <div className="rounded-xl bg-white py-12 text-center shadow-sm">
        <p className="text-gray-500">No past workouts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Past winning workouts</p>
      {archives.map((archive) => (
        <ArchiveCard key={archive.id} archive={archive} />
      ))}
    </div>
  );
}

interface ArchiveCardProps {
  archive: ArchivedWorkout;
}

function ArchiveCard({ archive }: ArchiveCardProps) {
  const weekDate = new Date(archive.weekEndingDate).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Week of {weekDate}</p>
            <h3 className="font-semibold text-gray-900">{archive.workout.name}</h3>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">by {archive.proposer.name}</p>
            <p className="text-sm text-gray-400">{archive.finalVoteCount} votes</p>
          </div>
        </div>

        <ExpandedTimeline segments={archive.workout.segments} />

        <button className="mt-4 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
          Propose Again
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Workout Builder - Fully Interactive
// ============================================================================

interface WorkoutBuilderProps {
  onClose: () => void;
  onSubmit: (workout: Workout) => void;
}

type SegmentType = 'warmup' | 'run' | 'rest' | 'cooldown' | 'repeat';

function WorkoutBuilder({ onClose, onSubmit }: WorkoutBuilderProps) {
  const [workoutName, setWorkoutName] = useState('');
  const [notes, setNotes] = useState('');
  const [segments, setSegments] = useState<Segment[]>([
    { id: genId(), type: 'warmup' },
    { id: genId(), type: 'cooldown' },
  ]);
  const [showSegmentPicker, setShowSegmentPicker] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [editingPath, setEditingPath] = useState<string[]>([]);

  const handleAddSegment = (index: number) => {
    setInsertIndex(index);
    setEditingPath([]);
    setShowSegmentPicker(true);
  };

  // Helper to find and modify segments at a nested path
  const modifyAtPath = (
    segs: Segment[],
    path: string[],
    modifier: (segments: Segment[]) => Segment[]
  ): Segment[] => {
    if (path.length === 0) {
      return modifier(segs);
    }

    const [currentId, ...restPath] = path;
    return segs.map((seg) => {
      if (seg.id === currentId && seg.type === 'repeat') {
        return {
          ...seg,
          segments: modifyAtPath(seg.segments, restPath, modifier),
        };
      }
      return seg;
    });
  };

  const handleSelectSegmentType = (type: SegmentType) => {
    if (insertIndex === null) return;

    let newSegment: Segment;
    switch (type) {
      case 'warmup':
        newSegment = { id: genId(), type: 'warmup' };
        break;
      case 'cooldown':
        newSegment = { id: genId(), type: 'cooldown' };
        break;
      case 'run':
        newSegment = { id: genId(), type: 'run', distanceMeters: 400, paceRange: 'hard' };
        break;
      case 'rest':
        newSegment = { id: genId(), type: 'rest', durationSeconds: 60, restType: 'standing' };
        break;
      case 'repeat':
        newSegment = {
          id: genId(),
          type: 'repeat',
          count: 4,
          segments: [
            { id: genId(), type: 'run', distanceMeters: 400, paceRange: 'hard' },
            { id: genId(), type: 'rest', durationSeconds: 60, restType: 'standing' },
          ],
        };
        break;
    }

    if (editingPath.length > 0) {
      // Adding inside a nested repeat
      setSegments((prev) =>
        modifyAtPath(prev, editingPath, (segs) => {
          const newSegs = [...segs];
          newSegs.splice(insertIndex, 0, newSegment);
          return newSegs;
        })
      );
    } else {
      // Adding at top level
      const newSegments = [...segments];
      newSegments.splice(insertIndex, 0, newSegment);
      setSegments(newSegments);
    }

    setShowSegmentPicker(false);
    setInsertIndex(null);
    setEditingPath([]);
  };

  const handleDeleteSegment = (id: string, path?: string[]) => {
    if (path && path.length > 0) {
      // Deleting from inside a nested repeat
      setSegments((prev) => modifyAtPath(prev, path, (segs) => segs.filter((s) => s.id !== id)));
    } else {
      setSegments((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleMoveSegment = (id: string, direction: 'up' | 'down', path?: string[]) => {
    const moveInArray = (arr: Segment[]) => {
      const index = arr.findIndex((s) => s.id === id);
      if (index === -1) return arr;
      if (direction === 'up' && index === 0) return arr;
      if (direction === 'down' && index === arr.length - 1) return arr;

      const newArr = [...arr];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = newArr[index];
      newArr[index] = newArr[swapIndex]!;
      newArr[swapIndex] = temp!;
      return newArr;
    };

    if (path && path.length > 0) {
      setSegments((prev) => modifyAtPath(prev, path, moveInArray));
    } else {
      setSegments(moveInArray);
    }
  };

  const handleUpdateSegment = (updated: Segment, path?: string[]) => {
    if (path && path.length > 0) {
      setSegments((prev) =>
        modifyAtPath(prev, path, (segs) => segs.map((s) => (s.id === updated.id ? updated : s)))
      );
    } else {
      setSegments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    }
    setEditingSegment(null);
    setEditingPath([]);
  };

  const handleAddToRepeat = (index: number, path?: string[]) => {
    setInsertIndex(index);
    setEditingPath(path || []);
    setShowSegmentPicker(true);
  };

  const handleEditInRepeat = (segment: Segment, path?: string[]) => {
    setEditingSegment(segment);
    setEditingPath(path || []);
  };

  const handleSubmit = () => {
    if (!workoutName.trim()) {
      alert('Please enter a workout name');
      return;
    }
    if (segments.length < 2) {
      alert('Please add at least one segment');
      return;
    }

    const workout: Workout = {
      id: `workout-${Date.now()}`,
      name: workoutName.trim(),
      wednesdayDate: VOTING_PERIOD.wednesdayDate,
      notes: notes.trim() || undefined,
      segments,
    };

    onSubmit(workout);
  };

  const duration = calculateWorkoutDuration(segments);

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="flex h-full flex-col bg-white">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            Cancel
          </button>
          <h2 className="font-semibold text-gray-900">New Workout</h2>
          <button
            onClick={handleSubmit}
            className="font-medium text-orange-500 hover:text-orange-600"
          >
            Submit
          </button>
        </header>

        {/* Form */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Workout Name *</label>
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="e.g., 4x400m Intervals"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                maxLength={50}
              />
            </div>

            {/* Preview */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Preview ({formatTotalDuration(duration)})
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <ExpandedTimeline segments={segments} />
              </div>
            </div>

            {/* Segments */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Segments</label>
              <div className="space-y-2">
                {segments.map((segment, index) => (
                  <div key={segment.id}>
                    {/* Add button before segment */}
                    <button
                      onClick={() => handleAddSegment(index)}
                      className="mb-2 flex w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-200 py-2 text-xs text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-500"
                    >
                      <span>+</span>
                    </button>

                    <EditableSegmentRow
                      segment={segment}
                      onDelete={() => handleDeleteSegment(segment.id)}
                      onMoveUp={() => handleMoveSegment(segment.id, 'up')}
                      onMoveDown={() => handleMoveSegment(segment.id, 'down')}
                      onEdit={() => setEditingSegment(segment)}
                      onAddToRepeat={handleAddToRepeat}
                      onDeleteFromRepeat={handleDeleteSegment}
                      onEditInRepeat={handleEditInRepeat}
                      onMoveInRepeat={handleMoveSegment}
                      isFirst={index === 0}
                      isLast={index === segments.length - 1}
                    />
                  </div>
                ))}

                {/* Add button at end */}
                <button
                  onClick={() => handleAddSegment(segments.length)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-600"
                >
                  <span>+</span> Add Segment
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any instructions or context..."
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                maxLength={500}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Segment Type Picker */}
      {showSegmentPicker && (
        <SegmentTypePicker
          onSelect={handleSelectSegmentType}
          onClose={() => {
            setShowSegmentPicker(false);
            setInsertIndex(null);
            setEditingPath([]);
          }}
          isInsideRepeat={editingPath.length > 0}
        />
      )}

      {/* Segment Editor */}
      {editingSegment && (
        <SegmentEditor
          segment={editingSegment}
          onSave={(updated) =>
            handleUpdateSegment(updated, editingPath.length > 0 ? editingPath : undefined)
          }
          onClose={() => {
            setEditingSegment(null);
            setEditingPath([]);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Editable Segment Row
// ============================================================================

interface EditableSegmentRowProps {
  segment: Segment;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onAddToRepeat?: (index: number, path?: string[]) => void;
  onDeleteFromRepeat?: (id: string, path?: string[]) => void;
  onEditInRepeat?: (segment: Segment, path?: string[]) => void;
  onMoveInRepeat?: (id: string, direction: 'up' | 'down', path?: string[]) => void;
  isFirst: boolean;
  isLast: boolean;
  nestLevel?: number;
  parentPath?: string[];
}

function EditableSegmentRow({
  segment,
  onDelete,
  onMoveUp,
  onMoveDown,
  onEdit,
  onAddToRepeat,
  onDeleteFromRepeat,
  onEditInRepeat,
  onMoveInRepeat,
  isFirst,
  isLast,
  nestLevel = 0,
  parentPath = [],
}: EditableSegmentRowProps) {
  const summary = getSegmentSummary(segment);
  const color = getSegmentColor(segment);

  if (segment.type === 'repeat') {
    const currentPath = [...parentPath, segment.id];

    return (
      <div
        className={`rounded-lg border border-gray-200 bg-white p-3 ${nestLevel > 0 ? 'bg-gray-50' : ''}`}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">
              {segment.count}×
            </span>
            <span className="text-sm font-medium text-gray-900">Repeat</span>
            {nestLevel > 0 && <span className="text-xs text-gray-400">(nested)</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
            >
              ↓
            </button>
            <button
              onClick={onEdit}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              ✎
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="ml-4 space-y-1.5 border-l-2 border-gray-200 pl-3">
          {segment.segments.map((nested, idx) => (
            <div key={nested.id}>
              {/* Add button inside repeat */}
              <button
                onClick={() => onAddToRepeat?.(idx, currentPath)}
                className="mb-1 flex w-full items-center justify-center rounded border border-dashed border-gray-200 py-1 text-xs text-gray-400 hover:border-gray-300"
              >
                +
              </button>

              {/* Recursively render nested segments */}
              {nested.type === 'repeat' ? (
                <EditableSegmentRow
                  segment={nested}
                  onDelete={() => onDeleteFromRepeat?.(nested.id, currentPath)}
                  onMoveUp={() => onMoveInRepeat?.(nested.id, 'up', currentPath)}
                  onMoveDown={() => onMoveInRepeat?.(nested.id, 'down', currentPath)}
                  onEdit={() => onEditInRepeat?.(nested, currentPath)}
                  onAddToRepeat={onAddToRepeat}
                  onDeleteFromRepeat={onDeleteFromRepeat}
                  onEditInRepeat={onEditInRepeat}
                  onMoveInRepeat={onMoveInRepeat}
                  isFirst={idx === 0}
                  isLast={idx === segment.segments.length - 1}
                  nestLevel={nestLevel + 1}
                  parentPath={currentPath}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className={`h-4 w-4 rounded ${getSegmentColor(nested)}`} />
                  <span className="flex-1 text-sm text-gray-700">{getSegmentSummary(nested)}</span>
                  <button
                    onClick={() => onMoveInRepeat?.(nested.id, 'up', currentPath)}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-xs text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => onMoveInRepeat?.(nested.id, 'down', currentPath)}
                    disabled={idx === segment.segments.length - 1}
                    className="rounded p-0.5 text-xs text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => onEditInRepeat?.(nested, currentPath)}
                    className="rounded p-0.5 text-xs text-gray-400 hover:bg-gray-100"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onDeleteFromRepeat?.(nested.id, currentPath)}
                    className="rounded p-0.5 text-xs text-red-400 hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
          {/* Add button at end of repeat */}
          <button
            onClick={() => onAddToRepeat?.(segment.segments.length, currentPath)}
            className="mt-1 flex w-full items-center justify-center rounded border border-dashed border-gray-200 py-1 text-xs text-gray-400 hover:border-gray-300"
          >
            + Add to repeat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className={`h-8 w-8 rounded ${color}`} />
      <div className="flex-1">
        <p className="font-medium text-gray-900">{summary}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
        >
          ↑
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
        >
          ↓
        </button>
        <button
          onClick={onEdit}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          ✎
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Segment Type Picker
// ============================================================================

interface SegmentTypePickerProps {
  onSelect: (type: SegmentType) => void;
  onClose: () => void;
  isInsideRepeat: boolean;
}

function SegmentTypePicker({ onSelect, onClose, isInsideRepeat }: SegmentTypePickerProps) {
  const types: { type: SegmentType; label: string; color: string; icon: string }[] = [
    { type: 'run', label: 'Run', color: 'bg-orange-400', icon: '🏃' },
    { type: 'rest', label: 'Rest', color: 'bg-gray-300', icon: '⏸' },
    { type: 'repeat', label: 'Repeat', color: 'bg-gray-100', icon: '🔁' },
    ...(!isInsideRepeat
      ? [
          { type: 'warmup' as SegmentType, label: 'Warmup', color: 'bg-blue-200', icon: '🔥' },
          {
            type: 'cooldown' as SegmentType,
            label: 'Cooldown',
            color: 'bg-purple-200',
            icon: '❄️',
          },
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Add Segment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {types.map(({ type, label, color, icon }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                <span className="text-xl">{icon}</span>
              </div>
              <span className="font-medium text-gray-900">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Segment Editor
// ============================================================================

interface SegmentEditorProps {
  segment: Segment;
  onSave: (updated: Segment) => void;
  onClose: () => void;
}

function SegmentEditor({ segment, onSave, onClose }: SegmentEditorProps) {
  const [editedSegment, setEditedSegment] = useState<Segment>(segment);

  const handleSave = () => {
    onSave(editedSegment);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Edit {segment.type.charAt(0).toUpperCase() + segment.type.slice(1)}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {segment.type === 'run' && (
            <RunSegmentForm
              segment={editedSegment as Segment & { type: 'run' }}
              onChange={(updated) => setEditedSegment(updated)}
            />
          )}

          {segment.type === 'rest' && (
            <RestSegmentForm
              segment={editedSegment as Segment & { type: 'rest' }}
              onChange={(updated) => setEditedSegment(updated)}
            />
          )}

          {segment.type === 'repeat' && (
            <RepeatSegmentForm
              segment={editedSegment as Segment & { type: 'repeat' }}
              onChange={(updated) => setEditedSegment(updated)}
            />
          )}

          {(segment.type === 'warmup' || segment.type === 'cooldown') && (
            <p className="text-sm text-gray-500">
              {segment.type === 'warmup' ? 'Warmup' : 'Cooldown'} segments have no configurable
              options.
            </p>
          )}

          <button
            onClick={handleSave}
            className="w-full rounded-lg bg-orange-500 py-3 font-medium text-white transition-colors hover:bg-orange-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Segment Forms
// ============================================================================

interface RunSegmentFormProps {
  segment: Segment & { type: 'run' };
  onChange: (segment: Segment) => void;
}

function RunSegmentForm({ segment, onChange }: RunSegmentFormProps) {
  const [mode, setMode] = useState<'distance' | 'duration'>(
    segment.durationSeconds ? 'duration' : 'distance'
  );

  return (
    <div className="space-y-4">
      {/* Distance or Duration toggle */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Measure by</label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('distance')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              mode === 'distance' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Distance
          </button>
          <button
            onClick={() => setMode('duration')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              mode === 'duration' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Duration
          </button>
        </div>
      </div>

      {mode === 'distance' ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Distance (meters)</label>
          <input
            type="number"
            value={segment.distanceMeters || 400}
            onChange={(e) =>
              onChange({
                ...segment,
                distanceMeters: parseInt(e.target.value) || 400,
                durationSeconds: undefined,
              })
            }
            className="w-full rounded-lg border border-gray-200 px-4 py-2"
            step={100}
            min={100}
          />
          <div className="mt-2 flex gap-2">
            {[200, 400, 800, 1000, 1600].map((d) => (
              <button
                key={d}
                onClick={() =>
                  onChange({ ...segment, distanceMeters: d, durationSeconds: undefined })
                }
                className={`rounded-full px-3 py-1 text-xs ${
                  segment.distanceMeters === d
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {d >= 1000 ? `${d / 1000}km` : `${d}m`}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Duration (seconds)</label>
          <input
            type="number"
            value={segment.durationSeconds || 60}
            onChange={(e) =>
              onChange({
                ...segment,
                durationSeconds: parseInt(e.target.value) || 60,
                distanceMeters: undefined,
              })
            }
            className="w-full rounded-lg border border-gray-200 px-4 py-2"
            step={30}
            min={30}
          />
          <div className="mt-2 flex gap-2">
            {[60, 120, 300, 600, 1200].map((d) => (
              <button
                key={d}
                onClick={() =>
                  onChange({ ...segment, durationSeconds: d, distanceMeters: undefined })
                }
                className={`rounded-full px-3 py-1 text-xs ${
                  segment.durationSeconds === d
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {d >= 60 ? `${d / 60}min` : `${d}s`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pace */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Pace</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PACE_RANGES) as PaceRange[]).map((pace) => (
            <button
              key={pace}
              onClick={() => onChange({ ...segment, paceRange: pace })}
              className={`rounded-lg px-3 py-2 text-left text-sm ${
                segment.paceRange === pace
                  ? 'bg-orange-100 text-orange-600 ring-1 ring-orange-500'
                  : 'bg-gray-50 text-gray-600'
              }`}
            >
              <div className="font-medium">{PACE_RANGES[pace].label}</div>
              <div className="text-xs opacity-75">{PACE_RANGES[pace].range}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RestSegmentFormProps {
  segment: Segment & { type: 'rest' };
  onChange: (segment: Segment) => void;
}

function RestSegmentForm({ segment, onChange }: RestSegmentFormProps) {
  return (
    <div className="space-y-4">
      {/* Duration */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Duration (seconds)</label>
        <input
          type="number"
          value={segment.durationSeconds}
          onChange={(e) =>
            onChange({ ...segment, durationSeconds: parseInt(e.target.value) || 60 })
          }
          className="w-full rounded-lg border border-gray-200 px-4 py-2"
          step={15}
          min={15}
        />
        <div className="mt-2 flex gap-2">
          {[30, 45, 60, 90, 120, 180].map((d) => (
            <button
              key={d}
              onClick={() => onChange({ ...segment, durationSeconds: d })}
              className={`rounded-full px-3 py-1 text-xs ${
                segment.durationSeconds === d
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {d >= 60 ? `${d / 60}min` : `${d}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Rest Type */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(REST_TYPE_LABELS) as RestType[]).map((type) => (
            <button
              key={type}
              onClick={() => onChange({ ...segment, restType: type })}
              className={`rounded-lg px-4 py-3 text-left text-sm ${
                segment.restType === type
                  ? 'bg-orange-100 text-orange-600 ring-1 ring-orange-500'
                  : 'bg-gray-50 text-gray-600'
              }`}
            >
              {REST_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RepeatSegmentFormProps {
  segment: Segment & { type: 'repeat' };
  onChange: (segment: Segment) => void;
}

function RepeatSegmentForm({ segment, onChange }: RepeatSegmentFormProps) {
  return (
    <div className="space-y-4">
      {/* Count */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Number of repetitions
        </label>
        <input
          type="number"
          value={segment.count}
          onChange={(e) => onChange({ ...segment, count: parseInt(e.target.value) || 1 })}
          className="w-full rounded-lg border border-gray-200 px-4 py-2"
          min={1}
          max={20}
        />
        <div className="mt-2 flex gap-2">
          {[2, 3, 4, 5, 6, 8, 10].map((c) => (
            <button
              key={c}
              onClick={() => onChange({ ...segment, count: c })}
              className={`rounded-full px-3 py-1 text-xs ${
                segment.count === c ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {c}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Avatar Component
// ============================================================================

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md';
}

function Avatar({ name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-gray-200 font-medium text-gray-600`}
    >
      {initials}
    </div>
  );
}

// ============================================================================
// Utility
// ============================================================================

let idCounter = 100;
function genId(): string {
  return `seg-${idCounter++}`;
}
