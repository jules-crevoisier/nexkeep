'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Share2, 
  Copy, 
  RefreshCw, 
  Check, 
  ExternalLink,
  QrCode,
  Mail,
  MessageSquare
} from 'lucide-react'

interface ShareButtonProps {
  onShare?: (url: string) => void
}

export function ShareButton({ onShare }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [shareData, setShareData] = useState<{token: string, shareUrl: string} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchShareData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/share-token')
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du lien')
      }
      
      const data = await response.json()
      setShareData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const regenerateToken = async () => {
    try {
      setIsRegenerating(true)
      setError(null)
      
      const response = await fetch('/api/user/share-token', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la régénération du lien')
      }
      
      const data = await response.json()
      setShareData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsRegenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (!shareData?.shareUrl) return
    
    try {
      await navigator.clipboard.writeText(shareData.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erreur lors de la copie:', err)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    if (!shareData) {
      fetchShareData()
    }
  }

  const shareViaEmail = () => {
    if (!shareData?.shareUrl) return
    
    const subject = 'Demande de remboursement'
    const body = `Bonjour,\n\nVous pouvez faire une demande de remboursement en cliquant sur ce lien :\n${shareData.shareUrl}\n\nCordialement`
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  const shareViaWhatsApp = () => {
    if (!shareData?.shareUrl) return
    
    const text = `Bonjour, vous pouvez faire une demande de remboursement ici : ${shareData.shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={handleOpen} variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          Partager le formulaire
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Partager le formulaire de remboursement
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Génération du lien...</span>
            </div>
          ) : shareData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-url">Lien de partage</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    value={shareData.shareUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={copyToClipboard}
                    variant={copied ? "default" : "outline"}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600">✓ Lien copié !</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Partager via</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={shareViaEmail}
                    className="flex-1"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={shareViaWhatsApp}
                    className="flex-1"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Actions</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(shareData.shareUrl, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Tester le lien
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={regenerateToken}
                    disabled={isRegenerating}
                    className="flex-1"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                    Régénérer
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Comment utiliser :</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Partagez ce lien avec les personnes qui doivent vous rembourser</li>
                  <li>• Elles pourront créer des demandes de remboursement</li>
                  <li>• Les demandes apparaîtront dans votre interface</li>
                  <li>• Vous recevrez une notification par email</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Erreur lors du chargement</p>
              <Button onClick={fetchShareData} className="mt-2">
                Réessayer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
