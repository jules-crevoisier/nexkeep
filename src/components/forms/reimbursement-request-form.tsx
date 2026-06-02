'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, CreditCard, User, Mail, Euro, X } from 'lucide-react'
import { toast } from 'sonner'
import { dispatchDataUpdated } from '@/lib/events'
import {
  useReimbursementFormState,
  parseAndValidateAmount,
  uploadFileToApi,
  parseApiError
} from '@/hooks/use-reimbursement-form'

interface ReimbursementRequestFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReimbursementRequestForm({ onSuccess, onCancel }: ReimbursementRequestFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    formData,
    receiptFile,
    ribFile,
    fileInputKey,
    fileError,
    handleInputChange,
    handleFileChange,
    clearFile,
    resetForm
  } = useReimbursementFormState()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Validation du montant
      const amountValidation = parseAndValidateAmount(formData.amount)
      if (!amountValidation.valid) {
        setError(amountValidation.error ?? 'Montant invalide')
        return
      }

      // Upload des fichiers si présents
      let receiptUrl: string | null = null
      let ribUrl: string | null = null

      if (receiptFile) {
        receiptUrl = await uploadFileToApi(receiptFile)
      }

      if (ribFile) {
        ribUrl = await uploadFileToApi(ribFile)
      }

      const response = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requesterName: formData.requesterName.trim(),
          requesterEmail: formData.requesterEmail.trim() || undefined,
          amount: amountValidation.amount,
          description: formData.description.trim(),
          notes: formData.notes.trim() || undefined,
          receiptUrl,
          ribUrl
        }),
      })

      if (!response.ok) {
        const errorMessage = await parseApiError(response)
        throw new Error(errorMessage)
      }

      resetForm()
      toast.success('Demande de remboursement créée')
      dispatchDataUpdated({ type: 'transactions' })
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/reimbursements')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Nouvelle demande de remboursement
        </CardTitle>
        <CardDescription>
          Créez une nouvelle demande de remboursement pour quelqu'un qui a acheté quelque chose pour vous.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requesterName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nom de la personne *
              </Label>
              <Input
                id="requesterName"
                name="requesterName"
                value={formData.requesterName}
                onChange={handleInputChange}
                placeholder="Jean Dupont"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requesterEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email (optionnel)
              </Label>
              <Input
                id="requesterEmail"
                name="requesterEmail"
                type="email"
                value={formData.requesterEmail}
                onChange={handleInputChange}
                placeholder="jean.dupont@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Montant à rembourser *
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
            <Label htmlFor="description">Description de l&apos;achat *</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Décrivez ce qui a été acheté..."
              required
              rows={3}
            />
          </div>

          <div className="space-y-4">
            {fileError && (
              <Alert variant="destructive">
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="receipt" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Facture (PDF, JPG, PNG)
              </Label>
              <Input
                key={`receipt-${fileInputKey}`}
                id="receipt"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'receipt')}
              />
              {receiptFile && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="truncate">Fichier sélectionné: {receiptFile.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => clearFile('receipt')}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rib" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                RIB (PDF, JPG, PNG) - Si première fois
              </Label>
              <Input
                key={`rib-${fileInputKey}`}
                id="rib"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'rib')}
              />
              {ribFile && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="truncate">Fichier sélectionné: {ribFile.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => clearFile('rib')}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes internes (optionnel)</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Notes pour votre référence..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Création...' : 'Créer la demande'}
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
