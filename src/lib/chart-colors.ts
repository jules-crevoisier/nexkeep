/**
 * Couleurs centralisées pour les graphiques (recharts), cohérentes avec la
 * marque bleue. Évite les hex dispersés dans les composants de charts.
 */

export const CHART_COLORS = {
  income: '#22c55e', // vert — revenus
  expense: '#ef4444', // rouge — dépenses
  net: '#3b82f6', // bleu — solde net
  bank: '#3b82f6', // bleu — compte banque
  cash: '#f59e0b', // ambre — compte liquide
} as const

/** Palette de roulement pour les catégories (bleu, vert, ambre, violet, rouge…). */
export const CATEGORY_PALETTE = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
]

export const categoryColor = (index: number): string =>
  CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]
