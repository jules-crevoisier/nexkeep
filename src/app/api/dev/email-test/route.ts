import { NextRequest, NextResponse } from 'next/server'
import { getEmailConfigStatus } from '@/lib/email-config'
import { sendInvitationEmail } from '@/lib/email'

/**
 * POST { "to": "email@example.com" } — envoi réel via le même flux que les invitations (dev uniquement).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponible en production' }, { status: 404 })
  }

  let body: { to?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : ''
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to)) {
    return NextResponse.json({ error: 'Champ "to" (email) requis et valide' }, { status: 400 })
  }

  const config = getEmailConfigStatus()

  try {
    await sendInvitationEmail(to, 'Organisation test', 'dev-token-test', null)
    return NextResponse.json({ ok: true, config, message: `Email d'invitation envoyé à ${to}` })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, config, error: message }, { status: 502 })
  }
}
