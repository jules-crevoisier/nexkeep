'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { InvoiceForm } from '@/components/forms/invoice-form';

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
  organisationId: string;
  clientId: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
    subtotal: number;
    tvaAmount: number;
    total: number;
    articleId?: string;
  }>;
}

export default function EditInvoicePage() {
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

  const handleSave = async (invoiceData: any) => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la facture');
      }

      router.push(`/facturation/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleCancel = () => {
    router.push(`/facturation/${params.id}`);
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
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            <Alert variant="destructive">
              <AlertDescription>{error || 'Facture non trouvée'}</AlertDescription>
            </Alert>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  // Convertir la facture au format attendu par le formulaire
  const formData = {
    organisationId: invoice.organisationId,
    clientId: invoice.clientId,
    date: new Date(invoice.date).toISOString().split('T')[0],
    dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
    status: invoice.status,
    notes: invoice.notes || '',
    paymentTerms: invoice.paymentTerms || '',
    items: invoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      tvaRate: item.tvaRate,
      subtotal: item.quantity * item.unitPrice,
      tvaAmount: (item.quantity * item.unitPrice) * (item.tvaRate / 100),
      total: (item.quantity * item.unitPrice) * (1 + item.tvaRate / 100),
      articleId: item.articleId
    }))
  };

  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Modifier la facture</h1>
            <p className="text-muted-foreground">
              {invoice.number} - {new Date(invoice.date).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <InvoiceForm
          onSave={handleSave}
          onCancel={handleCancel}
          initialData={formData}
        />
      </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
