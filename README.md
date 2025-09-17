# NexKeep - Gestionnaire de Budget pour Association

Une application web moderne de gestion de budget spécialement conçue pour les associations, utilisant shadcn/ui pour une interface élégante et professionnelle.

## 🚀 Fonctionnalités

### 📊 Tableau de Bord
- Vue d'ensemble des finances de l'association
- Statistiques en temps réel (revenus, dépenses, solde)
- Alertes budgétaires et notifications
- Transactions récentes

### 💰 Gestion des Budgets
- Création et suivi de budgets par catégorie
- Alertes de dépassement de budget
- Budgets récurrents (mensuels, annuels)
- Visualisation de l'utilisation des budgets

### 📝 Transactions
- Enregistrement des revenus et dépenses
- Catégorisation automatique des transactions
- Recherche et filtres avancés
- Historique complet des transactions

### 📈 Rapports et Analyses
- Rapports financiers détaillés
- Graphiques de tendances
- Analyse des revenus et dépenses par catégorie
- Export des données (PDF, Excel)

### 👥 Gestion des Membres
- Système de rôles et permissions
- Historique des actions des utilisateurs
- Notifications personnalisées

## 🛠️ Technologies Utilisées

- **Frontend**: Next.js 14 avec App Router
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript
- **Icons**: Lucide React
- **Charts**: Recharts (à installer)
- **Base de données**: SQLite avec Prisma (à configurer)

## 🎨 Design

L'application utilise le design system de shadcn/ui avec :
- Interface moderne et professionnelle
- Mode sombre/clair
- Design responsive (mobile-first)
- Composants accessibles
- Palette de couleurs adaptée aux associations

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd nexkeep
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Démarrer le serveur de développement**
   ```bash
   npm run dev
   ```

4. **Ouvrir dans le navigateur**
   ```
   http://localhost:3000
   ```

## 📁 Structure du Projet

```
src/
├── app/                    # App Router Next.js
│   ├── budget/             # Gestion des budgets
│   ├── transactions/       # Gestion des transactions
│   ├── reports/            # Rapports et statistiques
│   └── settings/           # Paramètres
├── components/             # Composants réutilisables
│   ├── ui/                 # Composants shadcn/ui
│   ├── forms/              # Formulaires
│   ├── charts/             # Graphiques
│   └── layout/             # Layout components
├── lib/                    # Utilitaires et configuration
├── hooks/                  # Hooks React personnalisés
└── types/                  # Types TypeScript
```

## 🎯 Fonctionnalités Spécifiques aux Associations

### Catégories Prédéfinies
- **Revenus**: Cotisations, Dons, Subventions, Événements
- **Dépenses**: Événements, Matériel, Formation, Locations, Marketing

### Gestion des Budgets
- Budgets par activité ou projet
- Suivi des dépenses vs budget alloué
- Alertes automatiques en cas de dépassement

### Rapports Adaptés
- Rapports pour les assemblées générales
- Suivi des objectifs financiers
- Analyse de la santé financière

## 🔐 Sécurité

- Authentification sécurisée (à implémenter avec NextAuth.js)
- Système de rôles (Admin, Trésorier, Membre)
- Validation des données côté client et serveur
- Audit trail des modifications

## 📱 Responsive Design

L'application est entièrement responsive et optimisée pour :
- **Mobile**: Interface tactile adaptée
- **Tablet**: Navigation optimisée
- **Desktop**: Interface complète avec sidebar

## 🚀 Déploiement

### Vercel (Recommandé)
1. Connecter le repository GitHub à Vercel
2. Configurer les variables d'environnement
3. Déployer automatiquement

### Autres Plateformes
- Netlify
- Railway
- DigitalOcean App Platform

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajouter nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

---

**Développé avec ❤️ pour les associations**