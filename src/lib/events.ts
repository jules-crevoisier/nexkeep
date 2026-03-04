/**
 * Événements personnalisés pour synchroniser les données entre composants.
 * Garantit que les montants et le budget sont rechargés en temps réel.
 */

export const DATA_UPDATED_EVENT = 'nexkeep:dataUpdated'

export type DataUpdatedDetail = {
  type?: 'budget' | 'transactions'
  newBudget?: number
}

/**
 * Émet un événement pour indiquer que les données ont changé.
 * - type 'budget' + newBudget: mise à jour du budget initial (paramètres)
 * - type 'transactions' ou sans détail: transactions modifiées → refetch nécessaire
 */
export const dispatchDataUpdated = (detail?: DataUpdatedDetail) => {
  window.dispatchEvent(
    new CustomEvent(DATA_UPDATED_EVENT, { detail: detail ?? { type: 'transactions' } })
  )
  window.dispatchEvent(
    new CustomEvent('budgetUpdated', {
      detail: detail?.newBudget !== undefined ? { newBudget: detail.newBudget } : { shouldRefetch: true }
    })
  )
}
