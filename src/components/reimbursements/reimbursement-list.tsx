'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Euro, 
  Calendar, 
  User, 
  FileText,
  CreditCard,
  Eye,
  Trash2,
  Download
} from 'lucide-react'

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
  reimbursements: Array<{
    id: string;
    amount: number;
    method: string;
    transferDate?: string;
    reference?: string;
    notes?: string;
    createdAt: string;
  }>
}

interface ReimbursementListProps {
  onViewDetails?: (request: ReimbursementRequest) => void
  onDelete?: (id: string) => void
  statusFilter?: string
}

export function ReimbursementList({ onViewDetails, onDelete, statusFilter }: ReimbursementListProps) {
  const [requests, setRequests] = useState<ReimbursementRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { label: 'Approuvée', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    rejected: { label: 'Rejetée', color: 'bg-red-100 text-red-800', icon: XCircle },
    paid: { label: 'Payée', color: 'bg-green-100 text-green-800', icon: CheckCircle }
  }

  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      
      const response = await fetch(`/api/reimbursements?${params}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des demandes')
      }
      
      const data = await response.json()
      setRequests(data.requests)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) return
    
    try {
      const response = await fetch(`/api/reimbursements/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }
      
      setRequests(requests.filter(req => req.id !== id))
      if (onDelete) onDelete(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Aucune demande de remboursement trouvée.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Liste des demandes */}
      {requests.map((request) => {
        const statusInfo = statusConfig[request.status as keyof typeof statusConfig]
        const StatusIcon = statusInfo.icon

        return (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{request.requesterName}</h3>
                    <Badge className={statusInfo.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground">{request.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Euro className="h-4 w-4" />
                      <span className="font-medium">{formatAmount(request.amount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(request.createdAt)}
                    </div>
                    {request.requesterEmail && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {request.requesterEmail}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    {request.receiptUrl && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <FileText className="h-4 w-4" />
                        <span>Facture</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(request.receiptUrl, '_blank')}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {request.ribUrl && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CreditCard className="h-4 w-4" />
                        <span>RIB</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(request.ribUrl, '_blank')}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {onViewDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(request)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && request.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(request.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
