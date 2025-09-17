'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Search,
  Loader2,
  Euro
} from 'lucide-react';
import { ArticleForm } from '@/components/forms/article-form';

interface Article {
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
}

interface ArticleListProps {
  onSelect?: (article: Article) => void;
  showActions?: boolean;
  showSearch?: boolean;
}

export function ArticleList({ onSelect, showActions = true, showSearch = true }: ArticleListProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/articles');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des articles');
      }
      
      const data = await response.json();
      setArticles(data);
      setFilteredArticles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = articles.filter(article =>
        article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredArticles(filtered);
    } else {
      setFilteredArticles(articles);
    }
  }, [searchTerm, articles]);

  const handleCreate = () => {
    setEditingArticle(null);
    setShowForm(true);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      await fetchArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleSave = async (articleData: Article) => {
    try {
      const url = editingArticle 
        ? `/api/articles/${editingArticle.id}`
        : '/api/articles';
      
      const method = editingArticle ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      setShowForm(false);
      setEditingArticle(null);
      await fetchArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingArticle(null);
  };

  const calculateTotal = (price: number, tvaRate: number) => {
    const tvaAmount = (price * tvaRate) / 100;
    return price + tvaAmount;
  };

  if (showForm) {
    return (
      <ArticleForm
        article={editingArticle || undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Chargement des articles...</span>
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
        <h2 className="text-2xl font-bold">Articles</h2>
        {showActions && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouvel article
          </Button>
        )}
      </div>

      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'Aucun article trouvé' : 'Aucun article'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? 'Aucun article ne correspond à votre recherche.'
                : 'Créez votre premier article pour commencer à facturer.'
              }
            </p>
            {showActions && !searchTerm && (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Créer un article
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <Card 
              key={article.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${onSelect ? 'hover:border-primary' : ''} ${!article.isActive ? 'opacity-60' : ''}`}
              onClick={() => onSelect?.(article)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{article.name}</CardTitle>
                      {article.category && (
                        <p className="text-sm text-muted-foreground">
                          {article.category}
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
                          handleEdit(article);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(article.id);
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
                <div className="space-y-3">
                  {article.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {article.price.toFixed(2)} € HT
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {article.unit}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      TVA {article.tvaRate}%
                    </span>
                    <span className="font-semibold">
                      {calculateTotal(article.price, article.tvaRate).toFixed(2)} € TTC
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge 
                      variant={article.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {article.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
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

