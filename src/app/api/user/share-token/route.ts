import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace'

// GET - Récupérer ou créer le token de partage
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTreasury("READ")

    const workspace = await prisma.workspace.findUnique({
      where: { id: ctx.workspace.id },
      select: { shareToken: true }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    // Si l'organisation n'a pas de token, en créer un
    if (!workspace.shareToken) {
      const token = randomBytes(32).toString('hex')

      await prisma.workspace.update({
        where: { id: ctx.workspace.id },
        data: { shareToken: token }
      })

      return NextResponse.json({
        token,
        shareUrl: `${process.env.NEXTAUTH_URL}/request-reimbursement/${token}`
      })
    }

    return NextResponse.json({
      token: workspace.shareToken,
      shareUrl: `${process.env.NEXTAUTH_URL}/request-reimbursement/${workspace.shareToken}`
    })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// POST - Régénérer le token de partage
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireTreasury("WRITE")

    const token = randomBytes(32).toString('hex')

    await prisma.workspace.update({
      where: { id: ctx.workspace.id },
      data: { shareToken: token }
    })

    return NextResponse.json({
      token,
      shareUrl: `${process.env.NEXTAUTH_URL}/request-reimbursement/${token}`,
      message: 'Token régénéré avec succès'
    })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
