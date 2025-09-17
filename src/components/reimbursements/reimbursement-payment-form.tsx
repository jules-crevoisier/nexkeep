'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, CreditCard, Euro, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FileViewer } from './file-viewer'

interface ReimbursementRequest {
  id: string
  requesterName: string
  amount: number
  description: string
  status: string
  receiptUrl?: string
  ribUrl?: string
}

interface ReimbursementPaymentFormProps {
  request: ReimbursementRequest
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReimbursementPaymentForm({ 
  request, 
  onSuccess, 
  onCancel 
}: ReimbursementPaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transferDate, setTransferDate] = useState<Date | undefined>(new Date())

  const [formData, setFormData] = useState({
    amount: request.amount.toString(),
    method: 'transfer',
    reference: '',
    notes: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, method: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reimbursements/${request.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          transferDate: transferDate?.toISOString()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'enregistrement du remboursement')
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Enregistrer le remboursement
        </CardTitle>
        <CardDescription>
          Marquez cette demande comme payée et enregistrez les détails du remboursement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Informations de la demande */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Demande de remboursement</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p><strong>Personne:</strong> {request.requesterName}</p>
            <p><strong>Description:</strong> {request.description}</p>
            <p><strong>Montant:</strong> {formatAmount(request.amount)}</p>
          </div>
        </div>

        {/* Visualiseur de fichiers */}
        <div className="mb-6">
          <FileViewer 
            receiptUrl={request.receiptUrl}
            ribUrl={request.ribUrl}
            requesterName={request.requesterName}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Montant remboursé *
            </Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="25.50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Méthode de paiement *</Label>
            <Select value={formData.method} onValueChange={handleSelectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une méthode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Virement bancaire</SelectItem>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.method === 'transfer' && (
            <>
              <div className="space-y-2">
                <Label>Date du virement</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transferDate ? format(transferDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={transferDate}
                      onSelect={setTransferDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Référence du virement (optionnel)</Label>
                <Input
                  id="reference"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  placeholder="Référence bancaire..."
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Notes sur le remboursement..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Enregistrement...' : 'Marquer comme payé'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
