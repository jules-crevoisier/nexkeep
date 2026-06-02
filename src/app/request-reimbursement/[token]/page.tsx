'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, User, Mail, Euro, CheckCircle, AlertCircle, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  useReimbursementFormState,
  parseAndValidateAmount,
  uploadFileToApi,
  parseApiError
} from '@/hooks/use-reimbursement-form'
import { safeParseJson } from '@/lib/api-utils'

function TokenRequestReimbursementPage() {
  const params = useParams()
  const token = params.token as string

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [userName, setUserName] = useState<string>('')

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

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/public/verify-token?token=${encodeURIComponent(token)}`)
        if (response.ok) {
          const data = await safeParseJson<{ userName?: string; user?: { name?: string } }>(response)
          setTokenValid(true)
          setUserName(data?.userName ?? data?.user?.name ?? '')
        } else {
          setTokenValid(false)
        }
      } catch {
        setTokenValid(false)
      }
    }

    if (token) {
      verifyToken()
    }
  }, [token])

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

      // Upload des fichiers
      let receiptUrl: string | null = null
      let ribUrl: string | null = null

      if (receiptFile) {
        receiptUrl = await uploadFileToApi(receiptFile)
      }

      if (ribFile) {
        ribUrl = await uploadFileToApi(ribFile)
      }

      const response = await fetch('/api/public/reimbursements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requesterName: formData.requesterName.trim(),
          requesterEmail: formData.requesterEmail.trim(),
          amount: amountValidation.amount,
          description: formData.description.trim(),
          notes: formData.notes.trim() || undefined,
          receiptUrl,
          ribUrl,
          token
        }),
      })

      if (!response.ok) {
        const errorMessage = await parseApiError(response)
        throw new Error(errorMessage)
      }

      resetForm()
      setIsSuccess(true)
      toast.success('Demande envoyée avec succès')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Vérification du lien...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Lien invalide
            </h2>
            <p className="text-gray-600 mb-6">
              Ce lien de demande de remboursement n'est plus valide ou a expiré.
              Veuillez contacter la personne qui vous a envoyé ce lien.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Demande envoyée !
            </h2>
            <p className="text-gray-600 mb-6">
              Votre demande de remboursement a été envoyée avec succès à {userName}. 
              Vous recevrez une confirmation par email.
            </p>
            <Button
              onClick={() => {
                setIsSuccess(false)
                resetForm()
              }}
              className="w-full"
            >
              Faire une nouvelle demande
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <CreditCard className="h-6 w-6" />
            Demande de Remboursement
          </CardTitle>
          <CardDescription>
            Formulaire de remboursement pour {userName}
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
                  Votre nom complet *
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
                  Votre email *
                </Label>
                <Input
                  id="requesterEmail"
                  name="requesterEmail"
                  type="email"
                  value={formData.requesterEmail}
                  onChange={handleInputChange}
                  placeholder="jean.dupont@email.com"
                  required
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
              <Label htmlFor="description">Description de l'achat *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Décrivez ce qui a été acheté, où, quand..."
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
                  Facture (PDF, JPG, PNG) *
                </Label>
                <Input
                  key={`receipt-${fileInputKey}`}
                  id="receipt"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'receipt')}
                  required
                />
                {receiptFile && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span className="truncate">✓ {receiptFile.name}</span>
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
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span className="truncate">✓ {ribFile.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => clearFile('rib')}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Informations supplémentaires (optionnel)</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Toute information utile pour le remboursement..."
                rows={2}
              />
            </div>


            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Envoi en cours...' : 'Envoyer la demande'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default TokenRequestReimbursementPage
