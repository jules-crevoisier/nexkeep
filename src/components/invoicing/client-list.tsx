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
  User, 
  Building2,
  MapPin, 
  Phone, 
  Mail, 
  Loader2
} from 'lucide-react';
import { ClientForm } from '@/components/forms/client-form';

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
  email?: string;
  phone?: string;
  siret?: string;
  tvaNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClientListProps {
  onSelect?: (client: Client) => void;
  showActions?: boolean;
}

export function ClientList({ onSelect, showActions = true }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des clients');
      }
      
      const data = await response.json();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreate = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleSave = async (clientData: Client) => {
    try {
      const url = editingClient 
        ? `/api/clients/${editingClient.id}`
        : '/api/clients';
      
      const method = editingClient ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      setShowForm(false);
      setEditingClient(null);
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  if (showForm) {
    return (
      <ClientForm
        client={editingClient || undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Chargement des clients...</span>
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
        <h2 className="text-2xl font-bold">Clients</h2>
        {showActions && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouveau client
          </Button>
        )}
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun client</h3>
            <p className="text-muted-foreground text-center mb-4">
              Créez votre premier client pour commencer à facturer.
            </p>
            {showActions && (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Créer un client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Card 
              key={client.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${onSelect ? 'hover:border-primary' : ''}`}
              onClick={() => onSelect?.(client)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      {client.company ? (
                        <Building2 className="w-5 h-5 text-primary" />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      {client.company && (
                        <p className="text-sm text-muted-foreground">
                          {client.company}
                        </p>
                      )}
                      {(client.city || client.country) && (
                        <p className="text-sm text-muted-foreground">
                          {[client.city, client.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {showActions && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(client);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client.id);
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
                  {client.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                  
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    {client.siret && (
                      <Badge variant="secondary" className="text-xs">
                        SIRET: {client.siret}
                      </Badge>
                    )}
                    {client.tvaNumber && (
                      <Badge variant="outline" className="text-xs">
                        TVA: {client.tvaNumber}
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

