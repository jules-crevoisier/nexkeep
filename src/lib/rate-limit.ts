import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds?: number
}

/** IP client (Vercel / proxy). */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown'
}

/**
 * Limite par clé (IP, email, token…) avec fenêtre glissante en base.
 * Fonctionne sur Vercel (stateless) contrairement à un store mémoire.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowMs)

  const count = await prisma.rateLimitEvent.count({
    where: { key, createdAt: { gt: since } },
  })

  if (count >= limit) {
    const oldest = await prisma.rateLimitEvent.findFirst({
      where: { key, createdAt: { gt: since } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    })
    const retryAfterSeconds = oldest
      ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + windowMs - Date.now()) / 1000))
      : Math.ceil(windowMs / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  await prisma.rateLimitEvent.create({ data: { key } })

  // Nettoyage opportuniste (évite la croissance infinie)
  if (Math.random() < 0.05) {
    prisma.rateLimitEvent
      .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
      .catch(() => undefined)
  }

  return { allowed: true }
}

/** Vérifie plusieurs limites ; renvoie la première violation. */
export async function checkRateLimits(
  checks: Array<{ key: string; limit: number; windowMs: number }>
): Promise<RateLimitResult> {
  for (const check of checks) {
    const result = await checkRateLimit(check.key, check.limit, check.windowMs)
    if (!result.allowed) return result
  }
  return { allowed: true }
}
