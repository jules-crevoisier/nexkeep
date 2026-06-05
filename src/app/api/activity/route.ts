import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace, workspaceErrorResponse } from '@/lib/workspace'

/** GET — fil d'activite de l'organisation active. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace()
    const limit = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 50))

    const events = await prisma.activityEvent.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        actorEmail: true,
        metadata: true,
        createdAt: true,
      },
    })

    return NextResponse.json(events)
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error('Erreur GET activity:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
