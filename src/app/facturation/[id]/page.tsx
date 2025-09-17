'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft,
  Download,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Euro,
  Building2,
  User
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Loader2 } from 'lucide-react';

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: string;
  subtotal: number;
  tvaAmount: number;
  total: number;
  notes?: string;
  paymentTerms?: string;
  organisation: {
    id: string;
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    siret?: string;
    tvaNumber?: string;
    phone?: string;
    email?: string;
  };
  client: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    siret?: string;
    tvaNumber?: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
    subtotal: number;
    tvaAmount: number;
    total: number;
  }>;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la facture');
      }
      
      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${invoice.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      router.push('/facturation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Brouillon', variant: 'secondary' as const },
      sent: { label: 'Envoyée', variant: 'default' as const },
      paid: { label: 'Payée', variant: 'default' as const },
      cancelled: { label: 'Annulée', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Chargement de la facture...</span>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  if (error || !invoice) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <Alert variant="destructive">
            <AlertDescription>{error || 'Facture non trouvée'}</AlertDescription>
          </Alert>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{invoice.number}</h1>
              <p className="text-muted-foreground">
                Facture du {new Date(invoice.date).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusBadge(invoice.status)}
            <Button onClick={handleDownloadPDF} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push(`/facturation/${invoice.id}/edit`)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Modifier
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDelete}
              className="text-destructive hover:text-destructive flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </Button>
          </div>
        </div>

        {/* Informations de la facture */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organisation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{invoice.organisation.name}</p>
              <p className="text-sm text-muted-foreground">{invoice.organisation.address}</p>
              <p className="text-sm text-muted-foreground">
                {invoice.organisation.postalCode} {invoice.organisation.city}
              </p>
              <p className="text-sm text-muted-foreground">{invoice.organisation.country}</p>
              {invoice.organisation.phone && (
                <p className="text-sm text-muted-foreground">Tél: {invoice.organisation.phone}</p>
              )}
              {invoice.organisation.email && (
                <p className="text-sm text-muted-foreground">Email: {invoice.organisation.email}</p>
              )}
              {invoice.organisation.siret && (
                <p className="text-sm text-muted-foreground">SIRET: {invoice.organisation.siret}</p>
              )}
              {invoice.organisation.tvaNumber && (
                <p className="text-sm text-muted-foreground">TVA: {invoice.organisation.tvaNumber}</p>
              )}
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{invoice.client.name}</p>
              {invoice.client.company && (
                <p className="text-sm text-muted-foreground">{invoice.client.company}</p>
              )}
              {invoice.client.address && (
                <p className="text-sm text-muted-foreground">{invoice.client.address}</p>
              )}
              {invoice.client.city && invoice.client.postalCode && (
                <p className="text-sm text-muted-foreground">
                  {invoice.client.postalCode} {invoice.client.city}
                </p>
              )}
              {invoice.client.country && (
                <p className="text-sm text-muted-foreground">{invoice.client.country}</p>
              )}
              {invoice.client.siret && (
                <p className="text-sm text-muted-foreground">SIRET: {invoice.client.siret}</p>
              )}
              {invoice.client.tvaNumber && (
                <p className="text-sm text-muted-foreground">TVA: {invoice.client.tvaNumber}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Détails de la facture */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date de facturation:</span>
                <span>{new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date d'échéance:</span>
                <span>{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Montants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total HT:</span>
                <span>{invoice.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVA:</span>
                <span>{invoice.tvaAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total TTC:</span>
                <span className="text-primary">{invoice.total.toFixed(2)} €</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.paymentTerms && (
                <div>
                  <span className="text-muted-foreground">Conditions de paiement:</span>
                  <p className="text-sm">{invoice.paymentTerms}</p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="text-sm">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Articles */}
        <Card>
          <CardHeader>
            <CardTitle>Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Description</th>
                    <th className="text-center py-2">Qté</th>
                    <th className="text-right py-2">Prix unitaire</th>
                    <th className="text-center py-2">TVA %</th>
                    <th className="text-right py-2">Total HT</th>
                    <th className="text-right py-2">Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={item.id || index} className="border-b">
                      <td className="py-2">{item.description}</td>
                      <td className="text-center py-2">{item.quantity}</td>
                      <td className="text-right py-2">{item.unitPrice.toFixed(2)} €</td>
                      <td className="text-center py-2">{item.tvaRate}%</td>
                      <td className="text-right py-2">{item.subtotal.toFixed(2)} €</td>
                      <td className="text-right py-2 font-semibold">{item.total.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
