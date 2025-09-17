'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, X, User, Building2 } from 'lucide-react';

interface Client {
  id?: string;
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
}

interface ClientFormProps {
  client?: Client;
  onSave: (client: Client) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClientForm({ 
  client, 
  onSave, 
  onCancel, 
  isLoading = false 
}: ClientFormProps) {
  const [formData, setFormData] = useState<Client>({
    name: client?.name || '',
    firstName: client?.firstName || '',
    lastName: client?.lastName || '',
    company: client?.company || '',
    address: client?.address || '',
    city: client?.city || '',
    postalCode: client?.postalCode || '',
    country: client?.country || 'France',
    email: client?.email || '',
    phone: client?.phone || '',
    siret: client?.siret || '',
    tvaNumber: client?.tvaNumber || '',
    notes: client?.notes || '',
  });

  const [clientType, setClientType] = useState<'individual' | 'company'>(
    client?.company ? 'company' : 'individual'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est obligatoire';
    }

    // Validation email si fourni
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Validation SIRET si fourni (14 chiffres)
    if (formData.siret && !/^\d{14}$/.test(formData.siret.replace(/\s/g, ''))) {
      newErrors.siret = 'Le SIRET doit contenir 14 chiffres';
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

  const handleChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClientTypeChange = (type: 'individual' | 'company') => {
    setClientType(type);
    if (type === 'individual') {
      setFormData(prev => ({ ...prev, company: '', siret: '', tvaNumber: '' }));
    } else {
      setFormData(prev => ({ ...prev, firstName: '', lastName: '' }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {client ? 'Modifier le client' : 'Nouveau client'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type de client */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Type de client</h3>
            
            <div className="flex gap-4">
              <Button
                type="button"
                variant={clientType === 'individual' ? 'default' : 'outline'}
                onClick={() => handleClientTypeChange('individual')}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Particulier
              </Button>
              <Button
                type="button"
                variant={clientType === 'company' ? 'default' : 'outline'}
                onClick={() => handleClientTypeChange('company')}
                className="flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Entreprise
              </Button>
            </div>
          </div>

          {/* Informations générales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations générales</h3>
            
            {clientType === 'individual' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="Prénom"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Nom de famille"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="company">Raison sociale *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder="Nom de l'entreprise"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nom d'affichage *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={clientType === 'individual' ? 'Nom complet' : 'Nom commercial'}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Adresse</h3>
            
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Ville"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  placeholder="75001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="France"
                />
              </div>
            </div>
          </div>

          {/* Informations légales (pour les entreprises) */}
          {clientType === 'company' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informations légales</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    value={formData.siret}
                    onChange={(e) => handleChange('siret', e.target.value)}
                    placeholder="12345678901234"
                    className={errors.siret ? 'border-red-500' : ''}
                  />
                  {errors.siret && (
                    <p className="text-sm text-red-500">{errors.siret}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tvaNumber">Numéro de TVA intracommunautaire</Label>
                  <Input
                    id="tvaNumber"
                    value={formData.tvaNumber}
                    onChange={(e) => handleChange('tvaNumber', e.target.value)}
                    placeholder="FR12345678901"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="01 23 45 67 89"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="client@email.fr"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notes</h3>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes internes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Notes sur ce client..."
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {client ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

