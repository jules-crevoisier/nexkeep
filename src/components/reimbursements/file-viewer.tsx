'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FileText, CreditCard, Download, Eye, ExternalLink } from 'lucide-react'

interface FileViewerProps {
  receiptUrl?: string
  ribUrl?: string
  requesterName: string
}

export function FileViewer({ receiptUrl, ribUrl, requesterName }: FileViewerProps) {
  const [selectedFile, setSelectedFile] = useState<{ type: 'receipt' | 'rib', url: string, name: string } | null>(null)

  const handleViewFile = (type: 'receipt' | 'rib', url: string) => {
    const fileName = type === 'receipt' ? `Facture_${requesterName}` : `RIB_${requesterName}`
    setSelectedFile({ type, url, name: fileName })
  }

  const handleDownload = (url: string, fileName: string) => {
    // Créer un lien de téléchargement
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getFileExtension = (url: string) => {
    return url.split('.').pop()?.toLowerCase() || ''
  }

  const isImage = (url: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    return imageExtensions.includes(getFileExtension(url))
  }

  const isPdf = (url: string) => {
    return getFileExtension(url) === 'pdf'
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-lg">Documents joints</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Facture */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Facture
            </CardTitle>
            <CardDescription>
              Justificatif d'achat
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {receiptUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <FileText className="h-3 w-3 mr-1" />
                    Disponible
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getFileExtension(receiptUrl).toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleViewFile('receipt', receiptUrl)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                      <DialogHeader>
                        <DialogTitle>Facture - {requesterName}</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-auto">
                        {isImage(receiptUrl) ? (
                          <img 
                            src={receiptUrl} 
                            alt="Facture" 
                            className="w-full h-auto max-h-[70vh] object-contain"
                          />
                        ) : isPdf(receiptUrl) ? (
                          <iframe 
                            src={receiptUrl} 
                            className="w-full h-[70vh] border-0"
                            title="Facture PDF"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                            <div className="text-center">
                              <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-muted-foreground">Aperçu non disponible</p>
                              <Button 
                                variant="outline" 
                                className="mt-2"
                                onClick={() => handleDownload(receiptUrl, `Facture_${requesterName}.${getFileExtension(receiptUrl)}`)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Télécharger
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownload(receiptUrl, `Facture_${requesterName}.${getFileExtension(receiptUrl)}`)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(receiptUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ouvrir
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucune facture fournie</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIB */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              RIB
            </CardTitle>
            <CardDescription>
              Relevé d'identité bancaire
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {ribUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Disponible
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getFileExtension(ribUrl).toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleViewFile('rib', ribUrl)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                      <DialogHeader>
                        <DialogTitle>RIB - {requesterName}</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-auto">
                        {isImage(ribUrl) ? (
                          <img 
                            src={ribUrl} 
                            alt="RIB" 
                            className="w-full h-auto max-h-[70vh] object-contain"
                          />
                        ) : isPdf(ribUrl) ? (
                          <iframe 
                            src={ribUrl} 
                            className="w-full h-[70vh] border-0"
                            title="RIB PDF"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                            <div className="text-center">
                              <CreditCard className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-muted-foreground">Aperçu non disponible</p>
                              <Button 
                                variant="outline" 
                                className="mt-2"
                                onClick={() => handleDownload(ribUrl, `RIB_${requesterName}.${getFileExtension(ribUrl)}`)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Télécharger
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownload(ribUrl, `RIB_${requesterName}.${getFileExtension(ribUrl)}`)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(ribUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ouvrir
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucun RIB fourni</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
