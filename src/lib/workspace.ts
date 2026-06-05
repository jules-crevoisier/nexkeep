import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { WorkspaceRole, TreasuryAccess, Workspace, WorkspaceMember } from "@prisma/client"
import { authOptions } from "./auth"
import { prisma } from "./prisma"

export const WORKSPACE_COOKIE = "nk_active_ws"

const ROLE_RANK: Record<WorkspaceRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
}

const TREASURY_RANK: Record<TreasuryAccess, number> = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
}

export type WorkspaceAuthCode =
  | "UNAUTHENTICATED"
  | "NO_WORKSPACE"
  | "FORBIDDEN"
  | "NO_TREASURY"

export class WorkspaceAuthError extends Error {
  code: WorkspaceAuthCode
  constructor(code: WorkspaceAuthCode) {
    super(code)
    this.code = code
    this.name = "WorkspaceAuthError"
  }
}

export interface WorkspaceContext {
  userId: string
  workspace: Workspace
  membership: WorkspaceMember
  role: WorkspaceRole
  treasuryAccess: TreasuryAccess
}

/**
 * Resout l'organisation active a partir de la session (identite) et du cookie
 * de selection. Les droits (role / acces tresorerie) sont relus en base a chaque
 * appel : aucun droit n'est mis en cache dans le JWT.
 * Retourne null si non connecte ou sans aucune appartenance.
 */
export async function getActiveWorkspaceContext(): Promise<WorkspaceContext | null> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return null

  const cookieStore = await cookies()
  const selectedId = cookieStore.get(WORKSPACE_COOKIE)?.value

  // 1. Si un cookie pointe vers une organisation dont l'utilisateur est membre, on l'utilise.
  if (selectedId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: selectedId, userId } },
      include: { workspace: true },
    })
    if (membership) {
      return toContext(userId, membership)
    }
  }

  // 2. Sinon, on retombe sur la premiere appartenance (organisation perso par defaut).
  const fallback = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  })
  if (!fallback) return null

  return toContext(userId, fallback)
}

function toContext(
  userId: string,
  membership: WorkspaceMember & { workspace: Workspace }
): WorkspaceContext {
  return {
    userId,
    workspace: membership.workspace,
    membership,
    role: membership.role,
    treasuryAccess: membership.treasuryAccess,
  }
}

/** Exige une organisation active (lecture autorisee a tout membre, VIEWER inclus). */
export async function requireWorkspace(): Promise<WorkspaceContext> {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    const session = await getServerSession(authOptions)
    throw new WorkspaceAuthError(session?.user?.id ? "NO_WORKSPACE" : "UNAUTHENTICATED")
  }
  return ctx
}

/** Exige un role minimum (OWNER > ADMIN > MEMBER > VIEWER). */
export async function requireRole(min: WorkspaceRole): Promise<WorkspaceContext> {
  const ctx = await requireWorkspace()
  if (ROLE_RANK[ctx.role] < ROLE_RANK[min]) {
    throw new WorkspaceAuthError("FORBIDDEN")
  }
  return ctx
}

/** Exige un acces tresorerie minimum (WRITE > READ > NONE). */
export async function requireTreasury(min: "READ" | "WRITE"): Promise<WorkspaceContext> {
  const ctx = await requireWorkspace()
  if (TREASURY_RANK[ctx.treasuryAccess] < TREASURY_RANK[min]) {
    throw new WorkspaceAuthError("NO_TREASURY")
  }
  return ctx
}

/**
 * Resout l'appartenance de l'utilisateur connecte a une organisation precise
 * (designee par son id, typiquement via l'URL). Utilise par les endpoints de
 * gestion d'organisation ou la cible peut differer de l'organisation active.
 */
export async function requireMembershipIn(workspaceId: string): Promise<WorkspaceContext> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) throw new WorkspaceAuthError("UNAUTHENTICATED")

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  })
  if (!membership) throw new WorkspaceAuthError("NO_WORKSPACE")

  return toContext(userId, membership)
}

/** Exige un role minimum dans une organisation precise (designee par son id). */
export async function requireRoleIn(workspaceId: string, min: WorkspaceRole): Promise<WorkspaceContext> {
  const ctx = await requireMembershipIn(workspaceId)
  if (ROLE_RANK[ctx.role] < ROLE_RANK[min]) {
    throw new WorkspaceAuthError("FORBIDDEN")
  }
  return ctx
}

/** Convertit une WorkspaceAuthError en reponse HTTP. A utiliser dans les catch des routes. */
export function workspaceErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof WorkspaceAuthError)) return null
  switch (error.code) {
    case "UNAUTHENTICATED":
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    case "NO_WORKSPACE":
      return NextResponse.json({ error: "Aucune organisation active" }, { status: 403 })
    case "FORBIDDEN":
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 })
    case "NO_TREASURY":
      return NextResponse.json({ error: "Accès à la trésorerie refusé" }, { status: 403 })
  }
}
