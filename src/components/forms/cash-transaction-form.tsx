'use client'

import { useState } from 'react'
import { parseAndValidateAmount, parseApiError } from '@/lib/api-utils'
import { dispatchDataUpdated } from '@/lib/events'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Euro } from 'lucide-react'

interface CashTransactionFormProps {
  /** "income" = entrée d'espèces, "expense" = sortie d'espèces */
  mode: 'income' | 'expense'
  onSuccess?: () => void
  onCancel?: () => void
}

export function CashTransactionForm({ mode, onSuccess, onCancel }: CashTransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const isIncome = mode === 'income'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const amountValidation = parseAndValidateAmount(amount)
      if (!amountValidation.valid) {
        setError(amountValidation.error ?? 'Montant invalide')
        return
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || (isIncome ? 'Entrée espèces' : 'Sortie espèces'),
          amount: amountValidation.amount,
          type: mode,
          account: 'cash',
          description: description.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const message = await parseApiError(response)
        throw new Error(message)
      }

      toast.success(isIncome ? 'Entrée espèces enregistrée' : 'Sortie espèces enregistrée')
      dispatchDataUpdated({ type: 'transactions' })
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="cash-name">Libellé</Label>
        <Input
          id="cash-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isIncome ? 'Ex: Recette buvette' : 'Ex: Achat fournitures'}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cash-amount" className="flex items-center gap-2">
          <Euro className="h-4 w-4" />
          Montant *
        </Label>
        <Input
          id="cash-amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="25.50"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cash-description">Description (optionnel)</Label>
        <Textarea
          id="cash-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Enregistrement...' : isIncome ? 'Ajouter l\'entrée' : 'Ajouter la sortie'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}

interface CashTransferFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function CashTransferForm({ onSuccess, onCancel }: CashTransferFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState<'bank' | 'cash'>('bank')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const amountValidation = parseAndValidateAmount(amount)
      if (!amountValidation.valid) {
        setError(amountValidation.error ?? 'Montant invalide')
        return
      }

      const response = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountValidation.amount,
          from,
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const message = await parseApiError(response)
        throw new Error(message)
      }

      toast.success('Transfert enregistré')
      dispatchDataUpdated({ type: 'transactions' })
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Sens du transfert</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={from === 'bank' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setFrom('bank')}
          >
            Banque → Caisse
          </Button>
          <Button
            type="button"
            variant={from === 'cash' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setFrom('cash')}
          >
            Caisse → Banque
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="transfer-amount" className="flex items-center gap-2">
          <Euro className="h-4 w-4" />
          Montant *
        </Label>
        <Input
          id="transfer-amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="50.00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transfer-notes">Note (optionnel)</Label>
        <Textarea
          id="transfer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ex: Dépôt de la caisse à la banque"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Transfert...' : 'Effectuer le transfert'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}
