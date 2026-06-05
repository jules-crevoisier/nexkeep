import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ACTIVITY_TYPES, recordActivity } from "@/lib/activity"
import {
  acceptInvitationErrorMessage,
  acceptInvitationForUser,
} from "@/lib/invitations"
import { WORKSPACE_COOKIE } from "@/lib/workspace"

// POST /api/invitations/[token]/accept - accepter une invitation (utilisateur connecté)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const email = session?.user?.email?.trim().toLowerCase()
    if (!userId || !email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const result = await acceptInvitationForUser(token, userId, email)
    if (!result.success) {
      return NextResponse.json(
        {
          error: acceptInvitationErrorMessage(result.reason),
          reason: result.reason,
        },
        { status: 400 }
      )
    }

    if (!result.alreadyMember) {
      await recordActivity({
        workspaceId: result.workspaceId,
        type: ACTIVITY_TYPES.INVITATION_ACCEPTED,
        title: `${email} a rejoint l'organisation`,
        actorId: userId,
        actorEmail: email,
        metadata: { token },
      })
    }

    const res = NextResponse.json({
      ok: true,
      workspaceId: result.workspaceId,
      alreadyMember: result.alreadyMember,
    })

    res.cookies.set(WORKSPACE_COOKIE, result.workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })

    return res
  } catch (error) {
    console.error("Erreur accept invitation:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
