'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, Clock, FileText } from 'lucide-react'

export default function RequestSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Demande envoyée avec succès !
          </h1>
          
          <p className="text-gray-600 mb-6">
            Votre demande de remboursement a été transmise et sera traitée dans les plus brefs délais.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              <span>Vous recevrez une confirmation par email</span>
            </div>
            
            <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Traitement sous 2-3 jours ouvrés</span>
            </div>
            
            <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>Conservez vos documents en attendant</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/request-reimbursement'}
              className="w-full"
            >
              Faire une nouvelle demande
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.close()}
              className="w-full"
            >
              Fermer cette page
            </Button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Besoin d'aide ?</h3>
            <p className="text-sm text-blue-800">
              Si vous avez des questions, contactez-nous par email avec votre numéro de demande.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
