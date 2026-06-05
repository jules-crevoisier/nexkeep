import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBudgetPreviewPdfBuffer, safeBudgetFilename } from '@/lib/orga-budget-pdf'
import { requireWorkspace, workspaceErrorResponse } from '@/lib/workspace'

export const runtime = 'nodejs'

/** GET — PDF budget previsionnel d'un projet (generation serveur). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const ctx = await requireWorkspace()

    const project = await prisma.project.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
    })
    if (!project) {
      return NextResponse.json({ error: 'Projet non trouve' }, { status: 404 })
    }

    const groups = await prisma.taskGroup.findMany({
      where: { projectId: id },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { name: true, budget: true, color: true },
    })

    const hasBudget =
      project.budget != null || groups.some((g) => g.budget != null)
    if (!hasBudget) {
      return NextResponse.json({ error: 'Aucun budget defini pour ce projet' }, { status: 400 })
    }

    const pdfBuffer = generateBudgetPreviewPdfBuffer({
      project: {
        name: project.name,
        description: project.description,
        status: project.status,
        endDate: project.endDate?.toISOString() ?? null,
        budget: project.budget,
        color: project.color,
      },
      groups,
    })

    const filename = `budget-prev-${safeBudgetFilename(project.name)}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error('Erreur budget PDF:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
