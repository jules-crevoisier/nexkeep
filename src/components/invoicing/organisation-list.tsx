'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe,
  Loader2
} from 'lucide-react';
import { OrganisationForm } from '@/components/forms/organisation-form';

interface Organisation {
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
}

interface OrganisationListProps {
  onSelect?: (organisation: Organisation) => void;
  showActions?: boolean;
}

export function OrganisationList({ onSelect, showActions = true }: OrganisationListProps) {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOrganisation, setEditingOrganisation] = useState<Organisation | null>(null);

  const fetchOrganisations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organisations');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des organisations');
      }
      
      const data = await response.json();
      setOrganisations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganisations();
  }, []);

  const handleCreate = () => {
    setEditingOrganisation(null);
    setShowForm(true);
  };

  const handleEdit = (organisation: Organisation) => {
    setEditingOrganisation(organisation);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette organisation ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organisations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      await fetchOrganisations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleSave = async (organisationData: Organisation) => {
    try {
      const url = editingOrganisation 
        ? `/api/organisations/${editingOrganisation.id}`
        : '/api/organisations';
      
      const method = editingOrganisation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(organisationData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      setShowForm(false);
      setEditingOrganisation(null);
      await fetchOrganisations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOrganisation(null);
  };

  if (showForm) {
    return (
      <OrganisationForm
        organisation={editingOrganisation || undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Chargement des organisations...</span>
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
        <h2 className="text-2xl font-bold">Organisations</h2>
        {showActions && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle organisation
          </Button>
        )}
      </div>

      {organisations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune organisation</h3>
            <p className="text-muted-foreground text-center mb-4">
              Créez votre première organisation pour commencer à facturer.
            </p>
            {showActions && (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Créer une organisation
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organisations.map((organisation) => (
            <Card 
              key={organisation.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${onSelect ? 'hover:border-primary' : ''}`}
              onClick={() => onSelect?.(organisation)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{organisation.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {organisation.city}, {organisation.country}
                      </p>
                    </div>
                  </div>
                  {showActions && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(organisation);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(organisation.id);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{organisation.address}</span>
                  </div>
                  
                  {organisation.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{organisation.phone}</span>
                    </div>
                  )}
                  
                  {organisation.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{organisation.email}</span>
                    </div>
                  )}
                  
                  {organisation.website && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span className="truncate">{organisation.website}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    {organisation.siret && (
                      <Badge variant="secondary" className="text-xs">
                        SIRET: {organisation.siret}
                      </Badge>
                    )}
                    {organisation.tvaNumber && (
                      <Badge variant="outline" className="text-xs">
                        TVA: {organisation.tvaNumber}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

