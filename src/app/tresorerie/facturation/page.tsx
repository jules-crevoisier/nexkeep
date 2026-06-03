'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Building2, 
  Users, 
  Package
} from 'lucide-react';
import { OrganisationList } from '@/components/invoicing/organisation-list';
import { ClientList } from '@/components/invoicing/client-list';
import { ArticleList } from '@/components/invoicing/article-list';
import { InvoiceList } from '@/components/invoicing/invoice-list';
import { InvoiceForm } from '@/components/forms/invoice-form';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function FacturationPage() {
  const [activeTab, setActiveTab] = useState('invoices');
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  const handleCreateInvoice = () => {
    setShowInvoiceForm(true);
  };

  const handleSaveInvoice = async (invoiceData: {
    organisationId: string;
    clientId: string;
    date?: string;
    dueDate?: string;
    status?: string;
    notes?: string;
    paymentTerms?: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      tvaRate: number;
      articleId?: string;
    }>;
  }) => {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la facture');
      }

      setShowInvoiceForm(false);
    } catch (err) {
      console.error('Erreur lors de la création:', err);
    }
  };

  const handleCancelInvoice = () => {
    setShowInvoiceForm(false);
  };

  if (showInvoiceForm) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <InvoiceForm
            onSave={handleSaveInvoice}
            onCancel={handleCancelInvoice}
          />
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Facturation</h1>
        <p className="text-muted-foreground">
          Gérez vos organisations, clients, articles et factures
        </p>
      </div>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Factures
          </TabsTrigger>
          <TabsTrigger value="organisations" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Organisations
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Articles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoiceList onCreateInvoice={handleCreateInvoice} />
        </TabsContent>

        <TabsContent value="organisations">
          <OrganisationList />
        </TabsContent>

        <TabsContent value="clients">
          <ClientList />
        </TabsContent>

        <TabsContent value="articles">
          <ArticleList />
        </TabsContent>
      </Tabs>
      </DashboardLayout>
    </AuthGuard>
  );
}
