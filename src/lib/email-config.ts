/**
 * Lecture et diagnostic des variables d'environnement Resend (sans exposer les secrets).
 */

const PLACEHOLDER_API_KEY = 're_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
export const DEFAULT_RESEND_FROM = 'NexKeep <noreply@nexkeep.fr>'

export type EmailConfigStatus = {
  resendConfigured: boolean
  apiKeyPresent: boolean
  apiKeyLooksValid: boolean
  fromAddress: string
  fromLooksValid: boolean
  usesVerifiedDomain: boolean
  nextAuthUrl: string
  adminEmail: string | null
  emailDebugEnabled: boolean
  warnings: string[]
}

function stripQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

/** Adresse expéditeur Resend (RESEND_FROM), avec repli sur le domaine nexkeep.fr. */
export function getResendFromAddress(): string {
  const raw = process.env.RESEND_FROM?.trim()
  if (!raw) return DEFAULT_RESEND_FROM
  return stripQuotes(raw)
}

export function isResendSandboxFrom(fromAddress: string): boolean {
  return (
    fromAddress.includes('@resend.dev') ||
    fromAddress.includes('onboarding@resend.dev')
  )
}

export function isEmailDebugEnabled(): boolean {
  return process.env.EMAIL_DEBUG === 'true' || process.env.EMAIL_DEBUG === '1'
}

export function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim()
  return !!key && key !== PLACEHOLDER_API_KEY
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '***'
  return `${key.slice(0, 6)}…${key.slice(-4)}`
}

export function getEmailConfigStatus(): EmailConfigStatus {
  const rawKey = process.env.RESEND_API_KEY?.trim() ?? ''
  const fromAddress = getResendFromAddress()
  const warnings: string[] = []

  const apiKeyPresent = rawKey.length > 0
  const apiKeyLooksValid = /^re_[a-zA-Z0-9_]+$/.test(rawKey)
  const resendConfigured = isResendConfigured()
  const usesVerifiedDomain = !isResendSandboxFrom(fromAddress)

  if (!apiKeyPresent) {
    warnings.push('RESEND_API_KEY est absente : les emails ne seront pas envoyés.')
  } else if (!apiKeyLooksValid) {
    warnings.push('RESEND_API_KEY ne ressemble pas à une clé Resend (format attendu : re_…).')
  }

  const fromMatch = /^.+<[^>]+@[^>]+>$/.test(fromAddress)
  const fromLooksValid = fromMatch || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromAddress)
  if (!fromLooksValid) {
    warnings.push(
      `RESEND_FROM semble invalide (« ${fromAddress} »). Exemple : RESEND_FROM="${DEFAULT_RESEND_FROM}"`
    )
  }

  if (isResendSandboxFrom(fromAddress)) {
    warnings.push(
      'RESEND_FROM utilise @resend.dev (mode test) : envoi limité à votre email de compte Resend. Utilisez nexkeep.fr.'
    )
  }

  if (!process.env.NEXTAUTH_URL?.trim()) {
    warnings.push('NEXTAUTH_URL est absent : les liens dans les emails utiliseront http://localhost:3000')
  }

  return {
    resendConfigured,
    apiKeyPresent,
    apiKeyLooksValid,
    fromAddress,
    fromLooksValid,
    usesVerifiedDomain,
    nextAuthUrl: process.env.NEXTAUTH_URL?.trim() || 'http://localhost:3000',
    adminEmail: process.env.ADMIN_EMAIL?.trim() || null,
    emailDebugEnabled: isEmailDebugEnabled(),
    warnings,
  }
}

export function logEmailDebug(
  context: string,
  payload: Record<string, unknown>
): void {
  if (!isEmailDebugEnabled()) return

  const status = getEmailConfigStatus()
  const key = process.env.RESEND_API_KEY?.trim() ?? ''

  console.log(`[email:${context}]`, {
    ...payload,
    config: {
      resendConfigured: status.resendConfigured,
      apiKey: key ? maskApiKey(key) : '(absent)',
      from: status.fromAddress,
      nextAuthUrl: status.nextAuthUrl,
      warnings: status.warnings,
    },
  })
}
