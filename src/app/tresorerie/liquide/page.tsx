'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePermissions } from '@/hooks/use-permissions'
import { useGuardedAction } from '@/hooks/use-guarded-action'
import { GuardedActionDialog } from '@/components/permissions/guarded-action-dialog'
import { RestrictedButton } from '@/components/permissions/restricted-button'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AuthGuard } from '@/components/auth/auth-guard'
import { CashTransactionForm, CashTransferForm } from '@/components/forms/cash-transaction-form'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { computeBalances, type BalanceTransaction, TRANSFER_CATEGORY } from '@/lib/balances'
import { DATA_UPDATED_EVENT } from '@/lib/events'
import { Wallet, Landmark, ArrowLeftRight, Plus, Minus, TrendingUp, TrendingDown } from 'lucide-react'

interface CashTx extends BalanceTransaction {
  id: string
  name: string
  date: string
  description?: string | null
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

export default function LiquidePage() {
  const { canWriteTreasury, treasuryDeniedMessage } = usePermissions()
  const treasuryGuard = useGuardedAction(canWriteTreasury, treasuryDeniedMessage)
  const [transactions, setTransactions] = useState<CashTx[]>([])
  const [bankInitial, setBankInitial] = useState(0)
  const [cashInitial, setCashInitial] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState<null | 'income' | 'expense' | 'transfer'>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [txRes, userRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/user/profile'),
      ])
      if (txRes.ok) {
        const data = await txRes.json()
        setTransactions(Array.isArray(data) ? data : [])
      }
      if (userRes.ok) {
        const user = await userRes.json()
        setBankInitial(Number(user.budgetInitial) || 0)
        setCashInitial(Number(user.cashInitial) || 0)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const handler = () => fetchData()
    window.addEventListener(DATA_UPDATED_EVENT, handler)
    return () => window.removeEventListener(DATA_UPDATED_EVENT, handler)
  }, [fetchData])

  const { bank, cash, total } = computeBalances(transactions, bankInitial, cashInitial)

  // Mouvements de la caisse liquide (compte "cash"), les plus récents d'abord
  const cashMovements = transactions
    .filter((t) => (t.account ?? 'bank') === 'cash')
    .slice(0, 50)

  const handleSuccess = () => {
    setOpenDialog(null)
    fetchData()
  }

  const openDialogGuarded = treasuryGuard.guard((kind: 'income' | 'expense' | 'transfer') => {
    setOpenDialog(kind)
  })

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold">Liquide</h1>
              <p className="text-muted-foreground">Gérez la caisse en espèces du BDE</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <RestrictedButton
                allowed={canWriteTreasury}
                deniedMessage={treasuryDeniedMessage}
                onClick={() => openDialogGuarded('income')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Entrée espèces
              </RestrictedButton>
              <RestrictedButton
                variant="outline"
                allowed={canWriteTreasury}
                deniedMessage={treasuryDeniedMessage}
                onClick={() => openDialogGuarded('expense')}
              >
                <Minus className="h-4 w-4 mr-2" />
                Sortie espèces
              </RestrictedButton>
              <RestrictedButton
                variant="outline"
                allowed={canWriteTreasury}
                deniedMessage={treasuryDeniedMessage}
                onClick={() => openDialogGuarded('transfer')}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Transfert
              </RestrictedButton>

              <Dialog open={openDialog === 'income'} onOpenChange={(o) => setOpenDialog(o ? 'income' : null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Entrée d&apos;espèces</DialogTitle>
                  </DialogHeader>
                  <CashTransactionForm mode="income" onSuccess={handleSuccess} onCancel={() => setOpenDialog(null)} />
                </DialogContent>
              </Dialog>

              <Dialog open={openDialog === 'expense'} onOpenChange={(o) => setOpenDialog(o ? 'expense' : null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sortie d&apos;espèces</DialogTitle>
                  </DialogHeader>
                  <CashTransactionForm mode="expense" onSuccess={handleSuccess} onCancel={() => setOpenDialog(null)} />
                </DialogContent>
              </Dialog>

              <Dialog open={openDialog === 'transfer'} onOpenChange={(o) => setOpenDialog(o ? 'transfer' : null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transfert Banque ↔ Caisse</DialogTitle>
                  </DialogHeader>
                  <CashTransferForm onSuccess={handleSuccess} onCancel={() => setOpenDialog(null)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Soldes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Solde Banque</CardTitle>
                <Landmark className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '-' : formatAmount(bank)}</div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Solde Liquide</CardTitle>
                <Wallet className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{isLoading ? '-' : formatAmount(cash)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total trésorerie</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{isLoading ? '-' : formatAmount(total)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Historique des mouvements liquide */}
          <Card>
            <CardHeader>
              <CardTitle>Mouvements de la caisse</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : cashMovements.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="Aucun mouvement"
                  description="Aucun mouvement en espèces pour le moment."
                />
              ) : (
                <div className="divide-y">
                  {cashMovements.map((t) => {
                    const isIncome = t.type === 'income'
                    const isTransfer = t.category === TRANSFER_CATEGORY
                    return (
                      <div key={t.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {isTransfer ? (
                              <ArrowLeftRight className="h-4 w-4" />
                            ) : isIncome ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{t.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(t.date).toLocaleDateString('fr-FR')}
                              {t.description ? ` · ${t.description}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold shrink-0 ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncome ? '+' : '-'}
                          {formatAmount(Math.abs(t.amount))}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <GuardedActionDialog
          open={treasuryGuard.deniedOpen}
          onOpenChange={treasuryGuard.setDeniedOpen}
          message={treasuryGuard.deniedMessage}
        />
      </DashboardLayout>
    </AuthGuard>
  )
}
