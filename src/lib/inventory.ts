// Helpers partagés pour le module Inventaire (création, édition, import)

export const INVENTORY_CONDITIONS = ["new", "good", "worn", "broken"] as const

/** Coupe et borne une chaîne ; retourne null si vide. */
export function trimOrNull(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

/**
 * Parse une date d'entrée hétérogène (import Excel) :
 * - Date JS ou ISO string -> Date
 * - "JJ/MM/AAAA" ou "JJ-MM-AAAA" -> Date
 * - numéro de série Excel (ex: 46266) -> Date
 * Retourne null si invalide ou vide.
 */
export function parseDate(v: unknown): Date | null {
  if (v == null || v === "") return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v

  if (typeof v === "number" && Number.isFinite(v)) {
    // Numéro de série Excel (jours depuis 1899-12-30)
    if (v > 0 && v < 100000) {
      const d = new Date(Math.round((v - 25569) * 86400 * 1000))
      return isNaN(d.getTime()) ? null : d
    }
    return null
  }

  if (typeof v === "string") {
    const s = v.trim()
    if (!s) return null
    // Format français JJ/MM/AAAA ou JJ-MM-AAAA
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
    if (m) {
      let [, dd, mm, yyyy] = m
      const year = yyyy.length === 2 ? 2000 + Number(yyyy) : Number(yyyy)
      const d = new Date(year, Number(mm) - 1, Number(dd))
      return isNaN(d.getTime()) ? null : d
    }
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

/** Parse un nombre optionnel positif ; retourne null si vide, undefined si invalide. */
export function parseOptionalNumber(v: unknown): number | null | undefined {
  if (v === "" || v == null) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return undefined
  return n
}
