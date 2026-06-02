/**
 * Calcul des soldes par compte (Banque / Liquide) à partir des transactions.
 *
 * Convention de signe robuste : on utilise toujours Math.abs(amount) et le `type`
 * pour déterminer le sens, car le signe stocké est incohérent dans la base
 * (remboursements stockés en négatif, dépenses manuelles en positif).
 */

export const TRANSFER_CATEGORY = 'Transfert'

export interface BalanceTransaction {
  type: string
  account?: string | null
  amount: number
  category?: string | null
}

export interface AccountBalances {
  bank: number
  cash: number
  total: number
}

/** Montant signé d'une transaction (+ pour income, - pour expense). */
export const signedAmount = (t: BalanceTransaction): number => {
  const value = Math.abs(t.amount)
  return t.type === 'income' ? value : -value
}

/**
 * Calcule les soldes Banque / Liquide / Total.
 * @param transactions liste des transactions de l'utilisateur
 * @param bankInitial solde banque initial (User.budgetInitial)
 * @param cashInitial solde liquide initial (User.cashInitial)
 */
export const computeBalances = (
  transactions: BalanceTransaction[],
  bankInitial = 0,
  cashInitial = 0
): AccountBalances => {
  let bank = bankInitial
  let cash = cashInitial

  for (const t of transactions) {
    const delta = signedAmount(t)
    if ((t.account ?? 'bank') === 'cash') {
      cash += delta
    } else {
      bank += delta
    }
  }

  return { bank, cash, total: bank + cash }
}

/**
 * Totaux Revenus / Dépenses pour les KPIs, en excluant les transferts internes
 * (catégorie "Transfert") qui ne sont pas de vrais revenus/dépenses.
 */
export const computeIncomeExpense = (
  transactions: BalanceTransaction[]
): { income: number; expenses: number } => {
  let income = 0
  let expenses = 0

  for (const t of transactions) {
    if (t.category === TRANSFER_CATEGORY) continue
    const value = Math.abs(t.amount)
    if (t.type === 'income') income += value
    else expenses += value
  }

  return { income, expenses }
}
