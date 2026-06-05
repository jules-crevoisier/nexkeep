# 🚀 Guide de déploiement sur Vercel

## 📋 Prérequis
- Compte Vercel (gratuit)
- Compte GitHub
- Repository Git avec votre code

## 🗄️ Étape 1 : Base de données PostgreSQL

### Option A : Vercel Postgres (Recommandée)
1. Créez votre projet sur Vercel
2. Allez dans l'onglet "Storage" 
3. Créez une base "Postgres"
4. Copiez l'URL de connexion

### Option B : Base externe
- Supabase : https://supabase.com (gratuit)
- PlanetScale : https://planetscale.com
- Railway : https://railway.app

## ⚙️ Étape 2 : Configuration Vercel Storage

### A. Activer Vercel Blob
1. Dans votre projet Vercel → **Storage** → **Create Database** → **Blob**
2. Copiez le token `BLOB_READ_WRITE_TOKEN` généré

### B. Variables d'environnement

Dans Vercel, ajoutez ces variables :

```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://votre-app.vercel.app
NEXTAUTH_SECRET=un-secret-de-32-caracteres-minimum
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXX
RESEND_API_KEY=votre-cle-resend
RESEND_FROM="NexKeep <noreply@nexkeep.fr>"
ADMIN_EMAIL=admin@yourdomain.com
```

## 🚀 Étape 3 : Déploiement

1. **Push sur GitHub** :
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connecter à Vercel** :
   - Importez votre repository
   - Configurez les variables d'environnement
   - Déployez !

3. **Migration de la base** :
   ```bash
   npx prisma db push
   ```

## 🔧 Scripts utiles

- `npm run build` : Build de production
- `npm run db:push` : Synchroniser le schéma DB
- `npm run db:migrate` : Appliquer les migrations

## ✅ Vérification post-déploiement

1. Testez la connexion à la base de données
2. Créez un compte utilisateur
3. Testez les fonctionnalités principales
4. Vérifiez les emails (si configuré)

## 🐛 Dépannage

- Vérifiez les logs Vercel
- Confirmez les variables d'environnement
- Testez la connexion DB en local d'abord
