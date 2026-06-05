import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ACTIVITY_TYPES, recordActivity } from "@/lib/activity"
import { acceptInvitationForUser } from "@/lib/invitations"

// POST /api/invitations/[token]/accept - accepter une invitation (utilisateur connecté)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const email = session?.user?.email
    if (!userId || !email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const workspaceId = await acceptInvitationForUser(token, userId, email)
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Invitation invalide, expirée ou destinée à un autre email" },
        { status: 400 }
      )
    }

    await recordActivity({
      workspaceId,
      type: ACTIVITY_TYPES.INVITATION_ACCEPTED,
      title: `${email} a rejoint l'organisation`,
      actorId: userId,
      actorEmail: email,
      metadata: { token },
    })

    return NextResponse.json({ ok: true, workspaceId })
  } catch (error) {
    console.error("Erreur accept invitation:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
