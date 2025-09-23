// Types pour l'application de gestion de budget

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  category?: string;
  date: string;
  createdAt: string;
  userId: string;
}

export interface TransactionWithBudget extends Transaction {
  budgetAfterTransaction: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  budget: number;
  budgetInitial: number;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReimbursementRequest {
  id: string;
  requesterName: string;
  requesterEmail?: string;
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  receiptUrl?: string;
  ribUrl?: string;
  notes?: string;
  isPublicRequest: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Organisation {
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
  website?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Client {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  email?: string;
  phone?: string;
  siret?: string;
  tvaNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Article {
  id: string;
  name: string;
  description?: string;
  price: number;
  tvaRate: number;
  unit: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  subtotal: number;
  tvaAmount: number;
  total: number;
  createdAt: string;
  invoiceId: string;
  articleId?: string;
  article?: Article;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  subtotal: number;
  tvaAmount: number;
  total: number;
  notes?: string;
  paymentTerms?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  organisationId: string;
  organisation: Organisation;
  clientId: string;
  client: Client;
  items: InvoiceItem[];
}

// Types pour les formulaires
export interface InvoiceFormData {
  organisationId: string;
  clientId: string;
  date?: string;
  dueDate?: string;
  status?: 'draft' | 'sent' | 'paid' | 'cancelled';
  notes?: string;
  paymentTerms?: string;
  items: InvoiceItemFormData[];
}

export interface InvoiceItemFormData {
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  articleId?: string;
}


