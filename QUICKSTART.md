# 🚀 Démarrage rapide — Tack Pulse MVP

## Étape 1 : Configuration

```bash
# Copier le template d'environnement
cp .env.example .env
```

Éditer `.env` et configurer **a minima** :

### Option A — Token GitHub personnel (le plus simple pour démarrer)
1. Créer un token sur https://github.com/settings/tokens (scopes : `public_repo`, `read:user`)
2. L'ajouter dans `.env` :
   ```
   GITHUB_PERSONAL_TOKEN=ghp_votretoken
   ```

### Option B — OAuth complet (requis pour l'auth multi-utilisateurs)
1. Créer une OAuth App : https://github.com/settings/developers
   - Homepage URL : `http://localhost:5173`
   - Callback URL : `http://localhost:4000/api/v1/auth/github/callback`
2. Renseigner dans `.env` :
   ```
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   ```

### Générer les secrets cryptographiques

```bash
# JWT secret
openssl rand -base64 64

# Encryption key (32 bytes hex)
openssl rand -hex 32
```

Les coller dans `.env` (`JWT_SECRET` et `ENCRYPTION_KEY`).

## Étape 2 : Lancement

```bash
docker-compose up --build
```

Au premier lancement, le build prend ~5 minutes (Prophet est lourd à compiler).

## Étape 3 : Vérification

| Service | URL | Vérification |
|---------|-----|---------------|
| Frontend | http://localhost:5173 | Doit afficher le dashboard |
| Backend | http://localhost:4000/health | `{"status":"ok"}` |
| Backend Ready | http://localhost:4000/health/ready | `{"status":"ready",...}` |
| AI Service | http://localhost:8000/health | `{"status":"ok",...}` |
| AI Docs | http://localhost:8000/docs | Swagger UI |

## Étape 4 : Premier projet

1. Ouvrir http://localhost:5173
2. Dans le formulaire, entrer par exemple : `facebook/react`
3. Cliquer **Add**
4. Cliquer sur la card pour voir la vue détaillée
5. Attendre 30 secondes — les métriques se mettront à jour automatiquement via WebSocket

## 🔍 Debugging

### Voir les logs d'un service
```bash
docker-compose logs -f backend
docker-compose logs -f ai-service
```

### Se connecter à PostgreSQL
```bash
docker-compose exec postgres psql -U osspulse -d osspulse
```

Quelques requêtes utiles :
```sql
\dt                              -- list tables
SELECT * FROM projects;
SELECT time, stars FROM metrics_snapshots ORDER BY time DESC LIMIT 10;
```

### Inspecter Redis
```bash
docker-compose exec redis redis-cli
> KEYS project:*
> GET project:{uuid}:latest
```

### Reset complet de la DB
```bash
docker-compose down -v   # ⚠️ Supprime le volume Postgres
docker-compose up
```

## 📊 Ce qui fonctionne dans ce MVP

- ✅ Ajout de projets GitHub par `owner/repo` ou URL
- ✅ Collecte automatique des métriques (stars, forks, issues, PRs) via BullMQ
- ✅ Stockage time-series dans TimescaleDB (hypertable + compression)
- ✅ Cache Redis 90s
- ✅ Pub/Sub Redis → Socket.io → mise à jour live du frontend
- ✅ Dashboard avec cards par projet
- ✅ Page détail projet : compteurs animés, line chart, heatmap commits, bubble chart contributeurs
- ✅ Indicateur connexion live (WebSocket)
- ✅ Microservice AI prêt pour Prophet (endpoint `/predict`)

## 🚧 Prochaines étapes (selon le cahier)

- Phase 1 — Auth GitHub OAuth complète (login)
- Phase 4 — Brancher l'AI service depuis le frontend (page `/forecast`)
- Phase 5 — Comparaison multi-projets, alertes, leaderboard
- Phase 6 — Tests unitaires + E2E (Vitest, Pytest, Playwright)
- Phase 7 — CI/CD GitHub Actions, déploiement Railway

## ⚠️ Limitations connues du MVP

- Pas d'authentification utilisateur (tous les projets sont partagés)
- Le scheduler enqueue toutes les 30s/5min/15min, mais le tout premier rafraîchissement complet (commits + contributeurs) prend jusqu'à 15 min après l'ajout
- Le rate limit GitHub est consommé par le seul `GITHUB_PERSONAL_TOKEN` — passez à l'OAuth pour multiplier les quotas
