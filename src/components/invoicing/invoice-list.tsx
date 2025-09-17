'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  FileText,
  Loader2,
  Calendar,
  Euro
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  };
  client: {
    id: string;
    name: string;
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

interface InvoiceListProps {
  onCreateInvoice: () => void;
}

export function InvoiceList({ onCreateInvoice }: InvoiceListProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/invoices');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des factures');
      }
      
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      await fetchInvoices();
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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Chargement des factures...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Factures</h2>
        <Button onClick={onCreateInvoice} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle facture
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune facture</h3>
            <p className="text-muted-foreground text-center mb-4">
              Créez votre première facture pour commencer.
            </p>
            <Button onClick={onCreateInvoice} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Créer une facture
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{invoice.number}</h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          <strong>Client:</strong> {invoice.client.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Organisation:</strong> {invoice.organisation.name}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Facturé le {new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Échéance le {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">HT:</span>
                        <span className="font-medium">{invoice.subtotal.toFixed(2)} €</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">TVA:</span>
                        <span className="font-medium">{invoice.tvaAmount.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-2 ml-6">
                    <div className="text-2xl font-bold text-primary">
                      {invoice.total.toFixed(2)} €
                    </div>
                    <div className="text-sm text-muted-foreground">
                      TTC
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(invoice.id)}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/facturation/${invoice.id}`)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Voir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/facturation/${invoice.id}/edit`)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteInvoice(invoice.id)}
                    className="text-destructive hover:text-destructive flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
