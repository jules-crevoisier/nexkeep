import { NextRequest, NextResponse } from "next/server"
import type { ProjectAccess } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireRoleIn, workspaceErrorResponse } from "@/lib/workspace"

const ACCESS_LEVELS: ProjectAccess[] = ["VIEWER", "CONTRIBUTOR", "MANAGER"]

// GET — projets de l'orga + assignations du membre
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params
  try {
    await requireRoleIn(id, "ADMIN")

    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
    })
    if (!member) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })
    }

    const [projects, assignments] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId: id },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: { id: true, name: true, color: true, isRestricted: true },
      }),
      prisma.projectMember.findMany({
        where: { memberId },
        select: { projectId: true, access: true },
      }),
    ])

    const assignmentMap = new Map(assignments.map((a) => [a.projectId, a.access]))

    return NextResponse.json({
      memberId,
      orgaScope: member.orgaScope,
      canAccessInbox: member.canAccessInbox,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        isRestricted: p.isRestricted,
        access: assignmentMap.get(p.id) ?? null,
      })),
    })
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur GET member projects:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT — remplace les assignations projet du membre
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params
  try {
    await requireRoleIn(id, "ADMIN")

    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
    })
    if (!member) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })
    }

    const body = await request.json()
    const assignments = Array.isArray(body.assignments) ? body.assignments : []

    const validated: { projectId: string; access: ProjectAccess }[] = []
    for (const item of assignments) {
      if (!item?.projectId || typeof item.projectId !== "string") continue
      const access = item.access as ProjectAccess
      if (!ACCESS_LEVELS.includes(access)) continue

      const project = await prisma.project.findFirst({
        where: { id: item.projectId, workspaceId: id },
        select: { id: true },
      })
      if (!project) continue

      validated.push({ projectId: item.projectId, access })
    }

    await prisma.$transaction([
      prisma.projectMember.deleteMany({ where: { memberId } }),
      ...(validated.length > 0
        ? [
            prisma.projectMember.createMany({
              data: validated.map((v) => ({
                projectId: v.projectId,
                memberId,
                access: v.access,
              })),
            }),
          ]
        : []),
    ])

    return NextResponse.json({ ok: true, count: validated.length })
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur PUT member projects:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
