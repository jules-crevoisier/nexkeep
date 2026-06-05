import type { OrgaScope, ProjectAccess, WorkspaceRole } from "@prisma/client"
import type { Prisma } from "@prisma/client"
import { prisma } from "./prisma"
import type { WorkspaceContext } from "./workspace"
import { WorkspaceAuthError } from "./workspace"

const ACCESS_RANK: Record<ProjectAccess, number> = {
  VIEWER: 0,
  CONTRIBUTOR: 1,
  MANAGER: 2,
}

/** ADMIN et OWNER contournent les restrictions de scope projet. */
export function isOrgaAdmin(role: WorkspaceRole): boolean {
  return role === "ADMIN" || role === "OWNER"
}

export function canMemberAccessInbox(ctx: WorkspaceContext): boolean {
  if (isOrgaAdmin(ctx.role)) return true
  return ctx.membership.canAccessInbox
}

/** Filtre Prisma pour les projets visibles par le membre. */
export function buildVisibleProjectsWhere(
  ctx: WorkspaceContext
): Prisma.ProjectWhereInput {
  const workspaceId = ctx.workspace.id

  if (isOrgaAdmin(ctx.role)) {
    return { workspaceId }
  }

  if (ctx.membership.orgaScope === "PROJECTS_ONLY") {
    return {
      workspaceId,
      members: { some: { memberId: ctx.membership.id } },
    }
  }

  // FULL : projets publics + projets restreints où le membre est assigné
  return {
    workspaceId,
    OR: [
      { isRestricted: false },
      { members: { some: { memberId: ctx.membership.id } } },
    ],
  }
}

/** Filtre Prisma pour les tâches visibles (inbox + projets accessibles). */
export function buildVisibleTasksWhere(
  ctx: WorkspaceContext,
  base: Prisma.TaskWhereInput = {}
): Prisma.TaskWhereInput {
  const workspaceId = ctx.workspace.id

  if (isOrgaAdmin(ctx.role)) {
    return { ...base, workspaceId }
  }

  // Filtre explicite sur les tâches courantes (sans projet)
  if ("projectId" in base && base.projectId === null) {
    if (!canMemberAccessInbox(ctx)) {
      return { ...base, workspaceId, id: "__no_access__" }
    }
    return { ...base, workspaceId }
  }

  // Filtre explicite sur un projet (acces deja verifie en amont)
  if ("projectId" in base && typeof base.projectId === "string") {
    return { ...base, workspaceId }
  }

  const projectWhere = buildVisibleProjectsWhere(ctx)
  const inboxAllowed = canMemberAccessInbox(ctx)

  if (inboxAllowed) {
    return {
      ...base,
      workspaceId,
      OR: [{ projectId: null }, { project: projectWhere }],
    }
  }

  return {
    ...base,
    workspaceId,
    project: projectWhere,
  }
}

/** Vérifie l'accès lecture à un projet ; lève FORBIDDEN si refusé. */
export async function assertProjectReadAccess(
  ctx: WorkspaceContext,
  projectId: string
): Promise<void> {
  if (isOrgaAdmin(ctx.role)) return

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspace.id },
    select: { id: true, isRestricted: true },
  })
  if (!project) {
    throw new WorkspaceAuthError("FORBIDDEN")
  }

  if (ctx.membership.orgaScope === "PROJECTS_ONLY") {
    const assigned = await prisma.projectMember.findUnique({
      where: {
        projectId_memberId: { projectId, memberId: ctx.membership.id },
      },
    })
    if (!assigned) throw new WorkspaceAuthError("FORBIDDEN")
    return
  }

  // FULL
  if (!project.isRestricted) return

  const assigned = await prisma.projectMember.findUnique({
    where: {
      projectId_memberId: { projectId, memberId: ctx.membership.id },
    },
  })
  if (!assigned) throw new WorkspaceAuthError("FORBIDDEN")
}

/** Vérifie l'accès écriture sur un projet (tâches, pôles…). */
export async function assertProjectWriteAccess(
  ctx: WorkspaceContext,
  projectId: string,
  minAccess: ProjectAccess = "CONTRIBUTOR"
): Promise<void> {
  await assertProjectReadAccess(ctx, projectId)
  if (isOrgaAdmin(ctx.role)) return

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspace.id },
    select: { isRestricted: true },
  })
  if (!project) throw new WorkspaceAuthError("FORBIDDEN")

  const needsExplicit =
    ctx.membership.orgaScope === "PROJECTS_ONLY" || project.isRestricted

  if (!needsExplicit) return

  const pm = await prisma.projectMember.findUnique({
    where: {
      projectId_memberId: { projectId, memberId: ctx.membership.id },
    },
  })
  if (!pm || ACCESS_RANK[pm.access] < ACCESS_RANK[minAccess]) {
    throw new WorkspaceAuthError("FORBIDDEN")
  }
}

/** Vérifie l'accès aux tâches courantes (sans projet). */
export function assertInboxAccess(ctx: WorkspaceContext): void {
  if (!canMemberAccessInbox(ctx)) {
    throw new WorkspaceAuthError("FORBIDDEN")
  }
}

/** Vérifie l'accès lecture/écriture à une tâche existante. */
export async function assertTaskAccess(
  ctx: WorkspaceContext,
  task: { projectId: string | null },
  write = false
): Promise<void> {
  if (!task.projectId) {
    if (write) assertInboxAccess(ctx)
    else if (!canMemberAccessInbox(ctx)) throw new WorkspaceAuthError("FORBIDDEN")
    return
  }

  if (write) {
    await assertProjectWriteAccess(ctx, task.projectId)
  } else {
    await assertProjectReadAccess(ctx, task.projectId)
  }
}

export const ORGA_SCOPE_LABELS: Record<OrgaScope, string> = {
  FULL: "Tous les projets publics",
  PROJECTS_ONLY: "Projets assignés uniquement",
}

export const PROJECT_ACCESS_LABELS: Record<ProjectAccess, string> = {
  VIEWER: "Lecture",
  CONTRIBUTOR: "Contribution",
  MANAGER: "Gestion",
}
