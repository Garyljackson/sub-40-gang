import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { validateSegments } from '@/lib/workout-utils';
import { WORKOUT_NAME_MAX_LENGTH, WORKOUT_NOTES_MAX_LENGTH } from '@/lib/workout-constants';
import type { UpdateProposalRequest } from '@/lib/workout-types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/workouts/proposals/[id]
 * Update own proposal
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateProposalRequest;
  const { name, notes, segments } = body;

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Workout name cannot be empty' }, { status: 400 });
    }
    if (name.length > WORKOUT_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Workout name must be ${WORKOUT_NAME_MAX_LENGTH} characters or less` },
        { status: 400 }
      );
    }
  }

  // Validate notes if provided
  if (notes !== undefined && notes !== null && notes.length > WORKOUT_NOTES_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Notes must be ${WORKOUT_NOTES_MAX_LENGTH} characters or less` },
      { status: 400 }
    );
  }

  // Validate segments if provided
  if (segments !== undefined) {
    if (!Array.isArray(segments)) {
      return NextResponse.json({ error: 'Segments must be an array' }, { status: 400 });
    }
    const segmentValidation = validateSegments(segments);
    if (!segmentValidation.valid) {
      return NextResponse.json({ error: segmentValidation.error }, { status: 400 });
    }
  }

  const supabase = createServiceClient();

  // Check if proposal exists and belongs to the user
  const { data: existingProposal, error: fetchError } = await supabase
    .from('workout_proposals')
    .select('id, proposer_id')
    .eq('id', id)
    .single();

  if (fetchError || !existingProposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (existingProposal.proposer_id !== session.memberId) {
    return NextResponse.json({ error: 'You can only update your own proposals' }, { status: 403 });
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (notes !== undefined) updateData.notes = notes?.trim() || null;
  if (segments !== undefined) updateData.segments = segments;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Update proposal
  const { data: updatedProposal, error: updateError } = await supabase
    .from('workout_proposals')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update proposal:', updateError);
    return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
  }

  return NextResponse.json(updatedProposal);
}

/**
 * DELETE /api/workouts/proposals/[id]
 * Delete own proposal
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  // Check if proposal exists and belongs to the user
  const { data: existingProposal, error: fetchError } = await supabase
    .from('workout_proposals')
    .select('id, proposer_id')
    .eq('id', id)
    .single();

  if (fetchError || !existingProposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (existingProposal.proposer_id !== session.memberId) {
    return NextResponse.json({ error: 'You can only delete your own proposals' }, { status: 403 });
  }

  // Delete proposal (votes will be cascade deleted)
  const { error: deleteError } = await supabase.from('workout_proposals').delete().eq('id', id);

  if (deleteError) {
    console.error('Failed to delete proposal:', deleteError);
    return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
