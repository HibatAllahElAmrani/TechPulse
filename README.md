# OSS Pulse — Visualisation Temps Réel de Projets Open-Source

Application web de visualisation en temps réel de l'activité des projets open-source GitHub, avec module IA de prédiction.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React 18 + Vite + TailwindCSS + D3 + Recharts)│
│                    Port: 5173                            │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP + WebSocket
┌──────────────────────────▼──────────────────────────────┐
│  Backend (Node.js + Fastify + TypeScript + Socket.io)   │
│                    Port: 4000                            │
└──┬───────────────────┬──────────────────┬──────────────┘
   │                   │                  │
┌──▼──────────┐  ┌────▼────┐  ┌──────────▼──────────────┐
│ PostgreSQL  │  │  Redis  │  │ AI Service (FastAPI)    │
│ TimescaleDB │  │ Pub/Sub │  │ Prophet                 │
│ Port: 5432  │  │ Port:   │  │ Port: 8000              │
│             │  │ 6379    │  │                         │
└─────────────┘  └─────────┘  └─────────────────────────┘
```

## 📁 Structure du projet

```
oss-pulse/
├── backend/              # API Fastify + ingestion GitHub + Socket.io
│   ├── src/
│   │   ├── routes/       # Endpoints REST
│   │   ├── services/     # Logique métier (GitHub, auth, métriques)
│   │   ├── workers/      # BullMQ workers (collecte données)
│   │   ├── plugins/      # Plugins Fastify (auth, db, redis)
│   │   ├── db/           # Migrations & schéma SQL
│   │   └── config/       # Configuration env
│   ├── Dockerfile
│   └── package.json
│
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── components/   # Composants UI (charts, cards)
│   │   ├── pages/        # Pages routées
│   │   ├── hooks/        # Custom hooks (useSocket, useMetrics)
│   │   ├── store/        # Zustand stores
│   │   ├── api/          # Client API
│   │   └── lib/          # Utilitaires
│   ├── Dockerfile
│   └── package.json
│
├── ai-service/           # Microservice Python (Phase 4)
│   ├── app/
│   │   ├── main.py       # FastAPI app
│   │   ├── models/       # Prophet wrapper
│   │   └── schemas/      # Pydantic models
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml    # Orchestration complète
└── .env.example          # Variables d'environnement
```

## 🚀 Démarrage rapide

### 1. Prérequis
- Docker & Docker Compose
- Un GitHub OAuth App (Settings → Developer settings → OAuth Apps)
  - Homepage URL: `http://localhost:5173`
  - Callback URL: `http://localhost:4000/api/v1/auth/github/callback`

### 2. Configuration
```bash
cp .env.example .env
# Éditer .env avec vos GITHUB_CLIENT_ID et GITHUB_CLIENT_SECRET
```

### 3. Lancement
```bash
docker-compose up --build
```

Services accessibles:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- AI Service: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 📋 Roadmap (selon cahier des charges)

| Phase | Status | Contenu |
|-------|--------|---------|
| Phase 0 — Setup | ✅ | Scaffolding, Docker, schéma DB |
| Phase 1 — Backend | 🚧 | Auth OAuth, ingestion GitHub, BullMQ |
| Phase 2 — Frontend | 🚧 | React app, routing, React Query |
| Phase 3 — Visualisations | ⏳ | Heatmap, bubble chart, line chart |
| Phase 4 — Module IA | ⏳ | Prophet forecasting |
| Phase 5 — Avancé | ⏳ | Comparaison, alertes, export |
| Phase 6 — Qualité | ⏳ | Tests, sécurité, WCAG |
| Phase 7 — Déploiement | ⏳ | CI/CD, prod |

## 🛠️ Stack technique

- **Frontend**: React 18, Vite, TailwindCSS, Zustand, React Query, D3.js, Recharts, Framer Motion, Socket.io-client
- **Backend**: Node.js 20, Fastify, TypeScript, Socket.io, BullMQ, Octokit
- **Base de données**: PostgreSQL 16 + TimescaleDB 2.x
- **Cache & Queue**: Redis 7
- **AI**: Python 3.11, FastAPI, Prophet
- **Auth**: GitHub OAuth 2.0 + JWT (RS256)

