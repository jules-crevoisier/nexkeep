/**
 * Gestion de l'année scolaire (BDE) : septembre N → août N+1.
 *
 * L'« année de départ » (startYear) identifie une année scolaire :
 *   startYear = 2025  ⇒  1er sept. 2025 → 31 août 2026  ⇒  libellé "2025-2026".
 */

/** Année de départ de l'année scolaire contenant `date` (sept→août). */
export const getAcademicYearStart = (date: Date): number => {
  const year = date.getFullYear()
  // Janvier (0) à août (7) appartiennent à l'année scolaire commencée l'an passé.
  return date.getMonth() >= 8 ? year : year - 1
}

/** Libellé "2025-2026" pour une année scolaire. */
export const academicYearLabel = (startYear: number): string =>
  `${startYear}-${startYear + 1}`

/** Bornes [1er sept. N 00:00 ; 31 août N+1 23:59:59.999] d'une année scolaire. */
export const academicYearRange = (
  startYear: number
): { start: Date; end: Date } => ({
  start: new Date(startYear, 8, 1, 0, 0, 0, 0),
  end: new Date(startYear + 1, 7, 31, 23, 59, 59, 999),
})

export interface AcademicMonth {
  /** Clé stable "YYYY-MM" (mois calendaire réel). */
  key: string
  /** Libellé court du mois (ex. "sept."). */
  label: string
  /** Premier jour du mois (utile pour le tri / l'affichage). */
  date: Date
}

/** Les 12 mois d'une année scolaire, ordonnés septembre → août. */
export const academicMonths = (startYear: number): AcademicMonth[] => {
  const months: AcademicMonth[] = []
  for (let i = 0; i < 12; i++) {
    const monthIndex = 8 + i // 8 = septembre
    const date = new Date(startYear, monthIndex, 1)
    const realMonth = date.getMonth() // 0-11 après débordement d'année
    months.push({
      key: `${date.getFullYear()}-${String(realMonth + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('fr-FR', { month: 'short' }),
      date,
    })
  }
  return months
}

interface DatedTransaction {
  date: string | Date
}

/**
 * Liste des années scolaires présentes dans les transactions (+ l'année courante),
 * triées de la plus récente à la plus ancienne.
 */
export const listAcademicYears = (
  transactions: DatedTransaction[]
): number[] => {
  const years = new Set<number>()
  years.add(getAcademicYearStart(new Date()))
  for (const t of transactions) {
    years.add(getAcademicYearStart(new Date(t.date)))
  }
  return Array.from(years).sort((a, b) => b - a)
}

/** Filtre les transactions appartenant à l'année scolaire `startYear`. */
export const filterByAcademicYear = <T extends DatedTransaction>(
  transactions: T[],
  startYear: number
): T[] => {
  const { start, end } = academicYearRange(startYear)
  return transactions.filter((t) => {
    const d = new Date(t.date)
    return d >= start && d <= end
  })
}
