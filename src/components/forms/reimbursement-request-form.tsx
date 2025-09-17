'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, CreditCard, User, Mail, Euro } from 'lucide-react'

interface ReimbursementRequestFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReimbursementRequestForm({ onSuccess, onCancel }: ReimbursementRequestFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [ribFile, setRibFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    requesterName: '',
    requesterEmail: '',
    amount: '',
    description: '',
    notes: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'receipt' | 'rib') => {
    const file = e.target.files?.[0]
    if (type === 'receipt') {
      setReceiptFile(file || null)
    } else {
      setRibFile(file || null)
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'upload')
      }

      const result = await response.json()
      return result.fileUrl
    } catch (error) {
      console.error('Erreur upload:', error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Upload des fichiers si présents
      let receiptUrl: string | null = null
      let ribUrl: string | null = null

      if (receiptFile) {
        receiptUrl = await uploadFile(receiptFile)
      }

      if (ribFile) {
        ribUrl = await uploadFile(ribFile)
      }

      const response = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          receiptUrl,
          ribUrl
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création de la demande')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/reimbursements')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
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
            <div className="space-y-2">
              <Label htmlFor="receipt" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Facture (PDF, JPG, PNG)
              </Label>
              <Input
                id="receipt"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'receipt')}
              />
              {receiptFile && (
                <p className="text-sm text-muted-foreground">
                  Fichier sélectionné: {receiptFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rib" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                RIB (PDF, JPG, PNG) - Si première fois
              </Label>
              <Input
                id="rib"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'rib')}
              />
              {ribFile && (
                <p className="text-sm text-muted-foreground">
                  Fichier sélectionné: {ribFile.name}
                </p>
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
