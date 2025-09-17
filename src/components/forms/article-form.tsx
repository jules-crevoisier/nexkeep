'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, X, Package } from 'lucide-react';

interface Article {
  id?: string;
  name: string;
  description?: string;
  price: number;
  tvaRate: number;
  unit: string;
  category?: string;
  isActive: boolean;
}

interface ArticleFormProps {
  article?: Article;
  onSave: (article: Article) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TVA_RATES = [
  { value: 0, label: '0% - Exonéré' },
  { value: 2.1, label: '2,1% - Presse, médicaments' },
  { value: 5.5, label: '5,5% - Restauration, livres' },
  { value: 10, label: '10% - Transport, hébergement' },
  { value: 20, label: '20% - Taux normal' },
];

const UNITS = [
  'unité',
  'heure',
  'jour',
  'mois',
  'année',
  'kg',
  'g',
  'l',
  'ml',
  'm',
  'm²',
  'm³',
  'forfait',
  'prestation',
];

const CATEGORIES = [
  'Services',
  'Produits',
  'Formation',
  'Conseil',
  'Maintenance',
  'Développement',
  'Design',
  'Marketing',
  'Autre',
];

export function ArticleForm({ 
  article, 
  onSave, 
  onCancel, 
  isLoading = false 
}: ArticleFormProps) {
  const [formData, setFormData] = useState<Article>({
    name: article?.name || '',
    description: article?.description || '',
    price: article?.price || 0,
    tvaRate: article?.tvaRate || 20,
    unit: article?.unit || 'unité',
    category: article?.category || '',
    isActive: article?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est obligatoire';
    }

    if (formData.price < 0) {
      newErrors.price = 'Le prix doit être positif';
    }

    if (formData.tvaRate < 0 || formData.tvaRate > 100) {
      newErrors.tvaRate = 'Le taux de TVA doit être entre 0 et 100';
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'L\'unité est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleChange = (field: keyof Article, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculateTotal = () => {
    const tvaAmount = (formData.price * formData.tvaRate) / 100;
    return formData.price + tvaAmount;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          {article ? 'Modifier l\'article' : 'Nouvel article'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations générales</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'article/service *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Nom de l'article ou service"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Description détaillée de l'article ou service"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unité *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => handleChange('unit', value)}
                >
                  <SelectTrigger className={errors.unit ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Sélectionner une unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-sm text-red-500">{errors.unit}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tarification */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tarification</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Prix unitaire HT (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={errors.price ? 'border-red-500' : ''}
                />
                {errors.price && (
                  <p className="text-sm text-red-500">{errors.price}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tvaRate">Taux de TVA (%) *</Label>
                <Select
                  value={formData.tvaRate.toString()}
                  onValueChange={(value) => handleChange('tvaRate', parseFloat(value))}
                >
                  <SelectTrigger className={errors.tvaRate ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Sélectionner un taux" />
                  </SelectTrigger>
                  <SelectContent>
                    {TVA_RATES.map((rate) => (
                      <SelectItem key={rate.value} value={rate.value.toString()}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tvaRate && (
                  <p className="text-sm text-red-500">{errors.tvaRate}</p>
                )}
              </div>
            </div>

            {/* Calcul automatique */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Calcul automatique</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Prix HT:</span>
                  <span className="ml-2 font-semibold">{formData.price.toFixed(2)} €</span>
                </div>
                <div>
                  <span className="text-muted-foreground">TVA ({formData.tvaRate}%):</span>
                  <span className="ml-2 font-semibold">
                    {((formData.price * formData.tvaRate) / 100).toFixed(2)} €
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <span className="text-muted-foreground">Prix TTC:</span>
                  <span className="ml-2 font-semibold text-lg">
                    {calculateTotal().toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Statut</h3>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="text-sm">
                Article actif (peut être utilisé dans les factures)
              </Label>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {article ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

