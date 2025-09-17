"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Briefcase, 
  Laptop, 
  TrendingUp, 
  ShoppingBag, 
  Heart, 
  ShoppingCart, 
  Car, 
  Home, 
  BookOpen, 
  Gamepad2, 
  Shirt, 
  Smartphone, 
  Utensils, 
  Minus,
  DollarSign
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color?: string;
  icon?: string;
}

interface CategorySelectorProps {
  selectedCategory?: string;
  onCategoryChange: (category: string) => void;
  type: "income" | "expense";
}

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  Briefcase,
  Laptop,
  TrendingUp,
  ShoppingBag,
  Heart,
  Plus,
  ShoppingCart,
  Car,
  Home,
  BookOpen,
  Gamepad2,
  Shirt,
  Smartphone,
  Utensils,
  Minus,
  DollarSign
};

export function CategorySelector({ selectedCategory, onCategoryChange, type }: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    color: "#3b82f6",
    icon: "DollarSign"
  });

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.filter((cat: Category) => cat.type === type));
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, [type]);

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return;

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategory.name,
          type: type,
          color: newCategory.color,
          icon: newCategory.icon
        })
      });

      if (response.ok) {
        setNewCategory({ name: "", color: "#3b82f6", icon: "DollarSign" });
        setShowAddForm(false);
        fetchCategories();
      }
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        fetchCategories();
        if (selectedCategory === categoryId) {
          onCategoryChange("");
        }
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const getIconComponent = (iconName?: string) => {
    const IconComponent = iconMap[iconName || "DollarSign"];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Catégorie</Label>
        <div className="h-10 bg-muted animate-pulse rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Catégorie</Label>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: category.color }}
                  >
                    {getIconComponent(category.icon)}
                  </div>
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une catégorie
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fetch("/api/categories/seed", { method: "POST" })}
        >
          Initialiser les catégories par défaut
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nouvelle catégorie</CardTitle>
            <CardDescription>
              Créer une nouvelle catégorie {type === "income" ? "de revenu" : "de dépense"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nom de la catégorie</Label>
                <Input
                  id="category-name"
                  placeholder="Ex: Salaire, Courses..."
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-color">Couleur</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="category-color"
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                    className="w-12 h-10"
                  />
                  <Input
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  type="button"
                  size="sm"
                  onClick={handleAddCategory}
                  disabled={!newCategory.name.trim()}
                >
                  Créer
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des catégories existantes */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>Catégories disponibles</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                className="cursor-pointer flex items-center space-x-1"
                onClick={() => onCategoryChange(category.id)}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(category.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
