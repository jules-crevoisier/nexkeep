import { prisma } from '@/lib/prisma'

export const ACTIVITY_TYPES = {
  INVITATION_SENT: 'invitation_sent',
  INVITATION_ACCEPTED: 'invitation_accepted',
  REIMBURSEMENT_REQUESTED: 'reimbursement_requested',
  REIMBURSEMENT_PAID: 'reimbursement_paid',
  TRANSACTION_CREATED: 'transaction_created',
  PROJECT_CREATED: 'project_created',
  TASK_COMPLETED: 'task_completed',
} as const

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES]

export type RecordActivityInput = {
  workspaceId: string
  type: ActivityType
  title: string
  description?: string
  actorId?: string | null
  actorEmail?: string | null
  metadata?: Record<string, unknown>
}

/** Enregistre un événement dans le fil d'activité (non bloquant). */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        workspaceId: input.workspaceId,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        metadata: input.metadata ?? undefined,
      },
    })
  } catch (error) {
    console.error('[activity] Enregistrement échoué:', error)
  }
}
