import { NextResponse } from 'next/server'
import { getEmailConfigStatus } from '@/lib/email-config'

/** GET — diagnostic Resend (dev uniquement). */
export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponible en production' }, { status: 404 })
  }

  return NextResponse.json(getEmailConfigStatus())
}
