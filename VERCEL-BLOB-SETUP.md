# 📁 Configuration Vercel Blob pour les uploads

## 🎯 Pourquoi Vercel Blob ?

Vercel ne permet pas l'écriture de fichiers dans `/public` en production. Vercel Blob est la solution officielle pour le stockage de fichiers.

## ⚙️ Configuration étape par étape

### 1. Activer Vercel Blob

1. **Projet Vercel** → **Storage** → **Create Database**
2. Sélectionnez **"Blob"**
3. Nommez votre storage (ex: `nexkeep-files`)
4. **Copiez le token** `BLOB_READ_WRITE_TOKEN`

### 2. Variables d'environnement

Ajoutez dans Vercel (Settings → Environment Variables) :

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXXXXXX
```

**⚠️ Important** : Ce token doit avoir les scopes `Production` et `Preview`.

### 3. Test local (optionnel)

Pour tester en local, créez `.env.local` :

```bash
BLOB_READ_WRITE_TOKEN=your_local_token_here
```

## 🚀 Comment ça fonctionne

### Ancien système (ne fonctionne pas sur Vercel)
```javascript
// ❌ Ne fonctionne pas en production Vercel
await writeFile('/public/uploads/file.pdf', buffer)
return { fileUrl: '/uploads/file.pdf' }
```

### Nouveau système (Vercel Blob)
```javascript
// ✅ Fonctionne parfaitement sur Vercel
const { url } = await put('uploads/file.pdf', file, { access: 'public' })
return { fileUrl: url } // URL publique directe
```

## 📋 URLs générées

Les fichiers uploadés génèrent des URLs comme :
```
https://12345abcde.blob.vercel-storage.com/uploads/1234567890_abc123.pdf
```

Ces URLs sont :
- ✅ **Publiques** (accessibles sans authentification)
- ✅ **Permanentes** (ne changent pas)
- ✅ **CDN** (rapides dans le monde entier)
- ✅ **Sécurisées** (HTTPS)

## 🔧 API mise à jour

L'API `/api/upload` retourne maintenant :

```json
{
  "success": true,
  "fileUrl": "https://xxx.blob.vercel-storage.com/uploads/file.pdf",
  "url": "https://xxx.blob.vercel-storage.com/uploads/file.pdf",
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "fileType": "application/pdf"
}
```

## 💰 Limites & Pricing

### Plan Gratuit (Hobby)
- **1 GB** de stockage
- **100 GB** de bande passante/mois
- Parfait pour débuter

### Plan Pro
- **100 GB** de stockage  
- **1 TB** de bande passante/mois
- $20/mois

## 🐛 Dépannage

### Erreur : "BLOB_READ_WRITE_TOKEN is not defined"
- Vérifiez que la variable est bien définie dans Vercel
- Redéployez après avoir ajouté la variable

### Erreur : "Access denied"
- Vérifiez les scopes du token (Production/Preview)
- Régénérez le token si nécessaire

### Les anciens fichiers ne s'affichent plus
- Normal : les anciens fichiers étaient dans `/public/uploads`
- Les nouveaux fichiers sont sur Vercel Blob
- Migration nécessaire si vous voulez récupérer les anciens

## ✅ Vérification

Pour tester que tout fonctionne :

1. **Déployez** sur Vercel
2. **Allez** dans Remboursements
3. **Uploadez** un fichier PDF
4. **Vérifiez** que l'URL commence par `https://xxx.blob.vercel-storage.com`

## 📚 Ressources

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Pricing Vercel Storage](https://vercel.com/pricing/storage)
