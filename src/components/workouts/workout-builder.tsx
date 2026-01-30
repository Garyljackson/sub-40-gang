'use client';

import { useState } from 'react';
import type { Segment, PaceRange, RestType } from '@/lib/workout-types';
import {
  PACE_RANGES,
  REST_TYPE_LABELS,
  WORKOUT_NAME_MAX_LENGTH,
  WORKOUT_NOTES_MAX_LENGTH,
  DEFAULT_RUN_DISTANCE_METERS,
  DEFAULT_RUN_PACE,
  DEFAULT_REST_DURATION_SECONDS,
  DEFAULT_REST_TYPE,
  DEFAULT_REPEAT_COUNT,
} from '@/lib/workout-constants';
import {
  getSegmentColor,
  getSegmentSummary,
  calculateWorkoutDuration,
  formatTotalDuration,
  generateSegmentId,
} from '@/lib/workout-utils';
import { WorkoutTimeline } from './workout-timeline';

interface WorkoutBuilderProps {
  onClose: () => void;
  onSubmit: (data: { name: string; notes?: string; segments: Segment[] }) => void;
  isSubmitting?: boolean;
  initialData?: {
    name: string;
    notes?: string;
    segments: Segment[];
  };
}

type SegmentType = 'warmup' | 'run' | 'rest' | 'cooldown' | 'repeat';

export function WorkoutBuilder({
  onClose,
  onSubmit,
  isSubmitting = false,
  initialData,
}: WorkoutBuilderProps) {
  const [workoutName, setWorkoutName] = useState(initialData?.name || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [segments, setSegments] = useState<Segment[]>(
    initialData?.segments || [
      { id: generateSegmentId(), type: 'warmup' },
      { id: generateSegmentId(), type: 'cooldown' },
    ]
  );
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
        newSegment = { id: generateSegmentId(), type: 'warmup' };
        break;
      case 'cooldown':
        newSegment = { id: generateSegmentId(), type: 'cooldown' };
        break;
      case 'run':
        newSegment = {
          id: generateSegmentId(),
          type: 'run',
          distanceMeters: DEFAULT_RUN_DISTANCE_METERS,
          paceRange: DEFAULT_RUN_PACE,
        };
        break;
      case 'rest':
        newSegment = {
          id: generateSegmentId(),
          type: 'rest',
          durationSeconds: DEFAULT_REST_DURATION_SECONDS,
          restType: DEFAULT_REST_TYPE,
        };
        break;
      case 'repeat':
        newSegment = {
          id: generateSegmentId(),
          type: 'repeat',
          count: DEFAULT_REPEAT_COUNT,
          segments: [
            {
              id: generateSegmentId(),
              type: 'run',
              distanceMeters: DEFAULT_RUN_DISTANCE_METERS,
              paceRange: DEFAULT_RUN_PACE,
            },
            {
              id: generateSegmentId(),
              type: 'rest',
              durationSeconds: DEFAULT_REST_DURATION_SECONDS,
              restType: DEFAULT_REST_TYPE,
            },
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

    onSubmit({
      name: workoutName.trim(),
      notes: notes.trim() || undefined,
      segments,
    });
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
          <h2 className="font-semibold text-gray-900">
            {initialData ? 'Edit Workout' : 'New Workout'}
          </h2>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="font-medium text-orange-500 hover:text-orange-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Submit'}
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
                maxLength={WORKOUT_NAME_MAX_LENGTH}
              />
            </div>

            {/* Preview */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Preview ({formatTotalDuration(duration)})
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <WorkoutTimeline segments={segments} />
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
                maxLength={WORKOUT_NOTES_MAX_LENGTH}
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
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
