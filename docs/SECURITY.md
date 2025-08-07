# Sécurité et Conformité - Smart Pantry Pro

## Vue d'ensemble

La sécurité est au cœur de Smart Pantry Pro. Ce document détaille nos mesures de sécurité, nos politiques de conformité et nos meilleures pratiques pour protéger les données de nos utilisateurs.

## Architecture de Sécurité

```
┌─────────────────────────────────────────────────────────────┐
│                     Couches de Sécurité                      │
├─────────────────────────────────────────────────────────────┤
│  Application     │ Input validation, XSS protection          │
│  API            │ Rate limiting, Authentication, CORS        │
│  Database       │ RLS, Encryption at rest, Backups          │
│  Infrastructure │ TLS/SSL, Firewall, DDoS protection        │
│  Physical       │ Data center security (Vercel/Supabase)    │
└─────────────────────────────────────────────────────────────┘
```

## 1. Protection des Données

### 1.1 Chiffrement

#### En Transit
- **TLS 1.3** pour toutes les communications
- **HSTS** (HTTP Strict Transport Security) activé
- Certificats SSL/TLS auto-renouvelés
- Pas de support pour les protocoles obsolètes

```nginx
# Configuration HTTPS
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

#### Au Repos
- **AES-256** pour les données sensibles
- Chiffrement transparent de la base de données
- Backups chiffrés
- Clés de chiffrement rotées trimestriellement

### 1.2 Données Personnelles

#### Classification des Données
```
┌─────────────────┬────────────────┬─────────────────────────┐
│ Type            │ Sensibilité    │ Protection              │
├─────────────────┼────────────────┼─────────────────────────┤
│ Email/Password  │ Critique       │ Hashage + Salt          │
│ Recettes        │ Privée         │ RLS + Encryption        │
│ Préférences     │ Normale        │ RLS                     │
│ Analytics       │ Anonymisée     │ Aggregation             │
└─────────────────┴────────────────┴─────────────────────────┘
```

#### Minimisation des Données
- Collecte uniquement des données nécessaires
- Suppression automatique après inactivité (2 ans)
- Anonymisation des données analytiques
- Pas de tracking publicitaire

### 1.3 Stockage Sécurisé

```typescript
// Exemple de stockage sécurisé
class SecureStorage {
  async storeUserData(userId: string, data: any) {
    // Validation
    const validated = validateUserData(data);
    
    // Chiffrement
    const encrypted = await encrypt(validated, getUserKey(userId));
    
    // Stockage avec audit trail
    await db.transaction(async (trx) => {
      await trx.userData.insert({ userId, data: encrypted });
      await trx.auditLog.insert({
        userId,
        action: 'data_stored',
        timestamp: new Date()
      });
    });
  }
}
```

## 2. Authentification et Autorisation

### 2.1 Authentification

#### Méthodes Supportées
- **Email/Password** avec validation forte
- **OAuth 2.0** (Google, Apple)
- **Magic Links** pour passwordless
- **2FA** (TOTP) optionnel

#### Politique de Mots de Passe
```javascript
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChar: true,
  preventCommon: true,
  preventUserInfo: true
};
```

#### Session Management
- JWT avec expiration courte (1h)
- Refresh tokens sécurisés (7 jours)
- Révocation immédiate possible
- Device fingerprinting

### 2.2 Autorisation

#### Row Level Security (RLS)
```sql
-- Politique d'accès aux recettes
CREATE POLICY "Users can only access their own recipes"
ON recipes
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Politique de partage
CREATE POLICY "Shared recipes are readable"
ON recipes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  id IN (
    SELECT recipe_id FROM recipe_shares
    WHERE shared_with = auth.uid()
  )
);
```

#### Rôles et Permissions
```typescript
enum UserRole {
  USER = 'user',
  PREMIUM = 'premium',
  ADMIN = 'admin'
}

const permissions = {
  user: ['read:own', 'write:own'],
  premium: ['read:own', 'write:own', 'share:recipes'],
  admin: ['read:all', 'write:all', 'delete:all']
};
```

## 3. Sécurité de l'Application

### 3.1 Protection Frontend

#### XSS Prevention
```typescript
// Sanitisation automatique avec React
const SafeRecipeDisplay = ({ recipe }) => {
  return (
    <div>
      {/* React échappe automatiquement */}
      <h1>{recipe.name}</h1>
      
      {/* Pour HTML, utiliser DOMPurify */}
      <div 
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(recipe.description)
        }}
      />
    </div>
  );
};
```

#### CSRF Protection
```typescript
// Token CSRF dans les requêtes
const apiCall = async (endpoint, data) => {
  const csrfToken = await getCsrfToken();
  
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify(data),
    credentials: 'same-origin'
  });
};
```

### 3.2 Protection API

#### Rate Limiting
```javascript
const rateLimits = {
  anonymous: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60 // 60 requêtes
  },
  authenticated: {
    windowMs: 15 * 60 * 1000,
    max: 600 // 600 requêtes
  },
  api: {
    extract_recipe: {
      windowMs: 60 * 1000, // 1 minute
      max: 10 // 10 extractions
    }
  }
};
```

#### Input Validation
```typescript
// Validation avec Zod
const recipeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  ingredients: z.array(z.object({
    name: z.string().min(1).max(100),
    quantity: z.number().positive(),
    unit: z.enum(['g', 'kg', 'ml', 'l', 'unit'])
  })),
  instructions: z.array(z.string().max(500))
});

// Utilisation
const validateRecipe = (data: unknown) => {
  return recipeSchema.parse(data);
};
```

### 3.3 Content Security Policy

```javascript
const cspPolicy = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "https://vercel.live"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "https:", "blob:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'", "https://api.smartpantrypro.com"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"]
};
```

## 4. Conformité Réglementaire

### 4.1 RGPD (Europe)

#### Droits des Utilisateurs
- **Accès** : Export complet des données
- **Rectification** : Modification via profil
- **Effacement** : Suppression complète
- **Portabilité** : Export JSON/CSV
- **Opposition** : Opt-out marketing

#### Implementation
```typescript
class GDPRCompliance {
  // Export des données utilisateur
  async exportUserData(userId: string): Promise<UserDataExport> {
    const data = await db.transaction(async (trx) => {
      const user = await trx.users.findById(userId);
      const recipes = await trx.recipes.where({ userId });
      const pantry = await trx.pantryItems.where({ userId });
      
      return {
        user: sanitizeUserData(user),
        recipes,
        pantry,
        exportDate: new Date(),
        format: 'json'
      };
    });
    
    return data;
  }
  
  // Suppression complète
  async deleteAllUserData(userId: string): Promise<void> {
    await db.transaction(async (trx) => {
      // Suppression en cascade
      await trx.recipes.deleteWhere({ userId });
      await trx.pantryItems.deleteWhere({ userId });
      await trx.shoppingLists.deleteWhere({ userId });
      await trx.users.delete(userId);
      
      // Log de suppression
      await trx.deletionLog.insert({
        userId,
        deletedAt: new Date(),
        reason: 'user_request'
      });
    });
  }
}
```

### 4.2 CCPA (Californie)

- Notification de collecte de données
- Opt-out de vente de données (non applicable)
- Non-discrimination
- Transparence des pratiques

### 4.3 Autres Réglementations

- **LGPD** (Brésil) : Similar to GDPR
- **PIPEDA** (Canada) : Consentement explicite
- **APP** (Australie) : Privacy principles

## 5. Sécurité des APIs Tierces

### 5.1 OpenAI API

```typescript
class SecureOpenAIClient {
  private sanitizeForAI(text: string): string {
    // Suppression des données personnelles
    return text
      .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{10,}\b/g, '[PHONE]')
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');
  }
  
  async extractRecipe(url: string): Promise<Recipe> {
    const sanitizedUrl = this.sanitizeUrl(url);
    
    // Pas d'envoi de données utilisateur à OpenAI
    const response = await openai.complete({
      prompt: `Extract recipe from: ${sanitizedUrl}`,
      // Pas de données personnelles dans le prompt
    });
    
    return this.parseRecipe(response);
  }
}
```

### 5.2 Intégrations Externes

```typescript
// Validation stricte des webhooks
const validateWebhook = (req: Request): boolean => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  
  // Vérifier la fraîcheur (5 minutes max)
  if (Date.now() - parseInt(timestamp) > 300000) {
    return false;
  }
  
  // Vérifier la signature HMAC
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(`${timestamp}.${req.body}`)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};
```

## 6. Audit et Monitoring

### 6.1 Logging de Sécurité

```typescript
enum SecurityEvent {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification'
}

class SecurityLogger {
  async log(event: SecurityEvent, metadata: any) {
    await db.securityLogs.insert({
      event,
      userId: metadata.userId,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      timestamp: new Date(),
      metadata: JSON.stringify(metadata)
    });
    
    // Alertes pour événements critiques
    if (this.isCritical(event)) {
      await this.sendAlert(event, metadata);
    }
  }
}
```

### 6.2 Monitoring Continu

- **SIEM** : Centralisation des logs
- **IDS/IPS** : Détection d'intrusion
- **Vulnerability Scanning** : Hebdomadaire
- **Dependency Scanning** : À chaque build

## 7. Incident Response Plan

### 7.1 Procédure d'Incident

```
1. Détection → 2. Containment → 3. Investigation → 4. Remediation → 5. Recovery → 6. Post-Mortem
```

### 7.2 Équipe de Réponse

| Rôle | Responsabilité | Contact |
|------|---------------|---------|
| Security Lead | Coordination | security@smartpantrypro.com |
| CTO | Décisions techniques | cto@smartpantrypro.com |
| Legal | Compliance | legal@smartpantrypro.com |
| Comms | Communication | pr@smartpantrypro.com |

### 7.3 Communication de Crise

- Notification sous 72h (RGPD)
- Template de communication prêt
- Canaux : Email, In-app, Blog
- Hotline dédiée activée

## 8. Security Checklist

### Développement
- [ ] Code review sécurité
- [ ] Tests de sécurité automatisés
- [ ] Scan des dépendances
- [ ] Validation des inputs

### Déploiement
- [ ] Configuration sécurisée
- [ ] Secrets en environnement
- [ ] Certificats SSL valides
- [ ] Headers de sécurité

### Opérations
- [ ] Monitoring actif
- [ ] Backups testés
- [ ] Patches appliqués
- [ ] Audits réguliers

## 9. Formation et Sensibilisation

### Pour l'Équipe
- Formation sécurité trimestrielle
- OWASP Top 10 awareness
- Secure coding practices
- Phishing simulations

### Pour les Utilisateurs
- Guide de sécurité in-app
- Tips de mots de passe forts
- Alertes de connexions suspectes
- 2FA encouragé

## 10. Contacts et Ressources

### Bug Bounty Program
- **Email** : security@smartpantrypro.com
- **Rewards** : 100€ - 5000€ selon sévérité
- **Scope** : *.smartpantrypro.com

### Urgences
- **24/7 Hotline** : +33 X XX XX XX XX
- **Incident Email** : incident@smartpantrypro.com

### Documentation
- [Security Best Practices](/docs/security-best-practices)
- [API Security Guide](/docs/api-security)
- [Privacy Policy](https://smartpantrypro.com/privacy)

---

*La sécurité est l'affaire de tous. Si vous découvrez une vulnérabilité, merci de nous contacter de manière responsable via security@smartpantrypro.com*