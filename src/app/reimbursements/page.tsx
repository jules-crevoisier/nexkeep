'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ReimbursementRequestForm } from '@/components/forms/reimbursement-request-form'
import { ReimbursementList } from '@/components/reimbursements/reimbursement-list'
import { ReimbursementPaymentForm } from '@/components/reimbursements/reimbursement-payment-form'
import { ShareButton } from '@/components/reimbursements/share-button'
import { Sidebar } from '@/components/layout/sidebar'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Plus, CreditCard, FileText, TrendingUp } from 'lucide-react'

interface ReimbursementRequest {
  id: string
  requesterName: string
  requesterEmail?: string
  amount: number
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  receiptUrl?: string
  ribUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
  reimbursements: any[]
}

export default function ReimbursementsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ReimbursementRequest | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [requests, setRequests] = useState<ReimbursementRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    setRefreshKey(prev => prev + 1) // Force refresh of the list
  }

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false)
    setSelectedRequest(null)
    setRefreshKey(prev => prev + 1) // Force refresh of the list
  }

  const handleViewDetails = (request: ReimbursementRequest) => {
    setSelectedRequest(request)
    setShowPaymentForm(true)
  }

  const handleDelete = (id: string) => {
    setRefreshKey(prev => prev + 1) // Force refresh of the list
  }

  // Charger les demandes pour les statistiques
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/reimbursements')
        if (response.ok) {
          const data = await response.json()
          setRequests(data.requests)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des demandes:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequests()
  }, [refreshKey])

  // Calculer les statistiques
  const pendingRequests = requests.filter(req => req.status === 'pending')
  const totalPendingAmount = pendingRequests.reduce((sum, req) => sum + req.amount, 0)
  const paidThisMonth = requests.filter(req => 
    req.status === 'paid' && 
    new Date(req.createdAt).getMonth() === new Date().getMonth()
  ).length

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Remboursements</h1>
          <p className="text-muted-foreground">
            Gérez les demandes de remboursement de vos achats
          </p>
        </div>
        
        <div className="flex gap-3">
          <ShareButton />
          
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouvelle demande de remboursement</DialogTitle>
              </DialogHeader>
              <ReimbursementRequestForm onSuccess={handleCreateSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : pendingRequests.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Demandes en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total à payer</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : `${totalPendingAmount.toFixed(2)} €`}
            </div>
            <p className="text-xs text-muted-foreground">
              Montant total en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ce mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : paidThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              Remboursements effectués
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Toutes les demandes</TabsTrigger>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="approved">Approuvées</TabsTrigger>
          <TabsTrigger value="rejected">Rejetées</TabsTrigger>
          <TabsTrigger value="paid">Payées</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ReimbursementList 
            key={refreshKey}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="pending">
          <ReimbursementList 
            key={refreshKey}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
            statusFilter="pending"
          />
        </TabsContent>

        <TabsContent value="approved">
          <ReimbursementList 
            key={refreshKey}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
            statusFilter="approved"
          />
        </TabsContent>

        <TabsContent value="rejected">
          <ReimbursementList 
            key={refreshKey}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
            statusFilter="rejected"
          />
        </TabsContent>

        <TabsContent value="paid">
          <ReimbursementList 
            key={refreshKey}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
            statusFilter="paid"
          />
        </TabsContent>
      </Tabs>

      {/* Dialog pour le paiement */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enregistrer le remboursement</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <ReimbursementPaymentForm 
              request={selectedRequest}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setShowPaymentForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </AuthGuard>
  )
}
