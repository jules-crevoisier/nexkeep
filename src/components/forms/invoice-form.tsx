'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  FileText, 
  Loader2,
  Euro,
  Calculator
} from 'lucide-react';

interface Organisation {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  siret?: string;
  tvaNumber?: string;
}

interface Client {
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
}

interface Article {
  id: string;
  name: string;
  description?: string;
  price: number;
  tvaRate: number;
  unit: string;
  category?: string;
  isActive: boolean;
}

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  subtotal: number;
  tvaAmount: number;
  total: number;
  articleId?: string;
}

interface InvoiceFormProps {
  onSave: (invoiceData: {
    organisationId: string;
    clientId: string;
    date?: string;
    dueDate?: string;
    status?: string;
    notes?: string;
    paymentTerms?: string;
    items: InvoiceItem[];
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: {
    id?: string;
    organisationId?: string;
    clientId?: string;
    date?: string;
    dueDate?: string;
    status?: string;
    notes?: string;
    paymentTerms?: string;
    items?: InvoiceItem[];
  };
}

export function InvoiceForm({ onSave, onCancel, isLoading = false, initialData }: InvoiceFormProps) {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    organisationId: initialData?.organisationId || '',
    clientId: initialData?.clientId || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    dueDate: initialData?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours
    status: initialData?.status || 'draft',
    notes: initialData?.notes || '',
    paymentTerms: initialData?.paymentTerms || 'Paiement à 30 jours',
  });

  const [items, setItems] = useState<InvoiceItem[]>(initialData?.items || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orgsRes, clientsRes, articlesRes] = await Promise.all([
        fetch('/api/organisations'),
        fetch('/api/clients'),
        fetch('/api/articles')
      ]);

      if (!orgsRes.ok || !clientsRes.ok || !articlesRes.ok) {
        throw new Error('Erreur lors du chargement des données');
      }

      const [orgs, clientsData, articlesData] = await Promise.all([
        orgsRes.json(),
        clientsRes.json(),
        articlesRes.json()
      ]);

      setOrganisations(orgs);
      setClients(clientsData);
      setArticles(articlesData.filter((article: Article) => article.isActive));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.organisationId) {
      newErrors.organisationId = 'L\'organisation est obligatoire';
    }

    if (!formData.clientId) {
      newErrors.clientId = 'Le client est obligatoire';
    }

    if (items.length === 0) {
      newErrors.items = 'Au moins un article est obligatoire';
    }

    // Vérifier que tous les articles ont une description et une quantité
    items.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`item_${index}_description`] = 'La description est obligatoire';
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'La quantité doit être positive';
      }
      if (item.unitPrice < 0) {
        newErrors[`item_${index}_unitPrice`] = 'Le prix unitaire doit être positif';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave({
        ...formData,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          tvaRate: item.tvaRate,
          subtotal: item.quantity * item.unitPrice,
          tvaAmount: (item.quantity * item.unitPrice) * (item.tvaRate / 100),
          total: (item.quantity * item.unitPrice) * (1 + item.tvaRate / 100),
          articleId: item.articleId
        }))
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      description: '',
      quantity: 1,
      unitPrice: 0,
      tvaRate: 20,
      subtotal: 0,
      tvaAmount: 0,
      total: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index], [field]: value };
      
      // Recalculer les totaux
      if (field === 'quantity' || field === 'unitPrice' || field === 'tvaRate') {
        item.subtotal = item.quantity * item.unitPrice;
        item.tvaAmount = item.subtotal * (item.tvaRate / 100);
        item.total = item.subtotal + item.tvaAmount;
      }
      
      newItems[index] = item;
      return newItems;
    });
  };

  const selectArticle = (index: number, articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (article) {
      updateItem(index, 'description', article.name);
      updateItem(index, 'unitPrice', article.price);
      updateItem(index, 'tvaRate', article.tvaRate);
      updateItem(index, 'articleId', articleId);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const tvaAmount = items.reduce((sum, item) => sum + (item.tvaAmount || 0), 0);
    const total = subtotal + tvaAmount;
    
    return { subtotal, tvaAmount, total };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Chargement des données...</span>
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
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Nouvelle facture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informations générales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations générales</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organisationId">Organisation *</Label>
                <Select
                  value={formData.organisationId}
                  onValueChange={(value) => handleChange('organisationId', value)}
                >
                  <SelectTrigger className={errors.organisationId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Sélectionner une organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.organisationId && (
                  <p className="text-sm text-red-500">{errors.organisationId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => handleChange('clientId', value)}
                >
                  <SelectTrigger className={errors.clientId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-sm text-red-500">{errors.clientId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date de facturation</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Date d&apos;échéance</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="sent">Envoyée</SelectItem>
                    <SelectItem value="paid">Payée</SelectItem>
                    <SelectItem value="cancelled">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Articles */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Articles</h3>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un article
              </Button>
            </div>

            {errors.items && (
              <p className="text-sm text-red-500">{errors.items}</p>
            )}

            {items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-center">
                    Aucun article ajouté. Cliquez sur "Ajouter un article" pour commencer.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-semibold">Article {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Article existant</Label>
                          <Select
                            value={item.articleId || ''}
                            onValueChange={(value) => selectArticle(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un article" />
                            </SelectTrigger>
                            <SelectContent>
                              {articles.map((article) => (
                                <SelectItem key={article.id} value={article.id}>
                                  {article.name} - {article.price.toFixed(2)}€ HT
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Description *</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Description de l'article"
                            className={errors[`item_${index}_description`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${index}_description`] && (
                            <p className="text-sm text-red-500">{errors[`item_${index}_description`]}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Quantité *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className={errors[`item_${index}_quantity`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${index}_quantity`] && (
                            <p className="text-sm text-red-500">{errors[`item_${index}_quantity`]}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Prix unitaire HT (€) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className={errors[`item_${index}_unitPrice`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${index}_unitPrice`] && (
                            <p className="text-sm text-red-500">{errors[`item_${index}_unitPrice`]}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Taux de TVA (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.tvaRate}
                            onChange={(e) => updateItem(index, 'tvaRate', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Total HT (€)</Label>
                          <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
                            <Euro className="w-4 h-4 mr-1" />
                            {(item.subtotal || 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Total TTC (€)</Label>
                          <div className="flex items-center h-10 px-3 border rounded-md bg-muted font-semibold">
                            <Euro className="w-4 h-4 mr-1" />
                            {(item.total || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Totaux */}
          {items.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Totaux
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total HT:</span>
                    <span className="font-semibold">{totals.subtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA:</span>
                    <span className="font-semibold">{totals.tvaAmount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total TTC:</span>
                    <span>{totals.total.toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes et conditions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notes et conditions</h3>
            
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Conditions de paiement</Label>
              <Input
                id="paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => handleChange('paymentTerms', e.target.value)}
                placeholder="Paiement à 30 jours"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Notes additionnelles..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || items.length === 0}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Créer la facture
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
