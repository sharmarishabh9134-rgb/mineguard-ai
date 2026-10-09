# MineGuard AI

MineGuard AI is a full-stack mine safety management platform with real-time worker tracking, SOS broadcasting, AI-powered risk intelligence, and role-based dashboards for Labour, Supervisor, Medical, Manager, and Admin roles.

## Repository structure

```
mineguard-ai/
|-- backend/                  # Express 5 + Socket.IO API (Node.js)
|   |-- config/               # Database connection (MongoDB/Mongoose)
|   |-- controllers/          # Route handler logic (auth, labour, risk, ...)
|   |-- middleware/           # JWT auth, role-based access control
|   |-- models/               # Mongoose data models (Worker, Incident, ...)
|   |-- routes/               # Express route definitions
|   |-- server.js             # App entry point
|   |-- database.json         # Seed / static data
|   |-- .env.example          # Copy to .env and fill in secrets
|   +-- package.json          # Backend-only dependencies
|-- frontend/                 # React 19 + Vite 8 + Tailwind CSS 4
|   |-- src/
|   |   |-- components/       # Shared components and role-based views
|   |   |-- services/         # API client, location tracker, offline sync
|   |   |-- utils/            # Audio, helpers
|   |   |-- App.jsx           # Root component
|   |   +-- main.jsx          # Vite entry point
|   |-- public/               # PWA service worker, icons
|   |-- index.html
|   |-- vite.config.js        # Vite config with /api proxy
|   |-- .env.example          # Copy to .env.local and fill in values
|   +-- package.json          # Frontend-only dependencies
|-- ml/                       # Python ML module (risk + anomaly detection)
|   |-- app.py                # Flask/FastAPI ML service
|   |-- train.py              # Model training
|   |-- predict.py            # Inference
|   |-- preprocessing.py
|   |-- data/                 # Training dataset
|   +-- models/               # Trained model artifacts used by inference
|-- docs/                     # Project documentation
|   +-- AI_SETUP.md           # AI/ML setup guide
|-- dev.js                    # Root dev launcher (starts backend + frontend)
|-- .gitignore
+-- README.md
```

## Quick start

### Prerequisites
- Node.js 20+
- Python 3.10+ (for ML module)
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.
npm run dev
```

API available at: `http://localhost:5002` by default. Set `PORT` to override it.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local if backend runs on a non-default host/port
npm run dev
```

Frontend available at: `http://localhost:5173`

The frontend automatically proxies all `/api/*` requests to the backend via Vite's dev proxy.

From the repository root, `npm run dev` starts both applications. The launcher uses
`API_PORT` when set, then `PORT`, and otherwise defaults to `5002`.

### 3. Run both together (from repo root)

```bash
# From repo root - launches backend + frontend concurrently
node dev.js
```

Root `npm run build`, `npm run lint`, and `npm run preview` delegate to the frontend.

### 4. ML module (optional)

```bash
cd ml
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt   # if requirements.txt exists
python app.py
```

## Environment variables

### Backend (`backend/.env.example` -> `backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5002` | Backend server port; deployment platforms can provide their own value |
| `MONGODB_URI` | No | `mongodb://localhost:27017/mineguard_db` | MongoDB connection string |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `JWT_SECRET` | **Yes (prod)** | _(none)_ | Secret for signing JWT tokens |
| `GOOGLE_API_KEY` | No | _(blank)_ | Gemini API key for AI assistant features |

### Frontend (`frontend/.env.example` -> `frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://127.0.0.1:5002` | Backend API URL for Vite dev proxy |

> **Never commit `.env` or `.env.local` files.** They are excluded by `.gitignore`.
> Use the `.env.example` files as templates.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Node.js, Express 5, Socket.IO |
| Database | MongoDB (Mongoose) |
| Auth | JWT, bcryptjs |
| ML | Python, scikit-learn (risk + anomaly detection) |
| Real-time | Socket.IO (SOS, GPS, notifications) |

## User roles

| Role | Access |
|---|---|
| **Labour** | Dashboard, SOS, GPS, documents, AI assistant |
| **Supervisor** | Map management, command center, labour oversight |
| **Manager** | Control room, production dashboard, risk intelligence |
| **Medical** | Medical dashboard, incident response |
| **Admin** | Full system access, user management |

## Security notes

- All API routes protected by JWT middleware
- Role-based access control enforced server-side
- `.env` files excluded from version control
- `GOOGLE_API_KEY` is server-side only — never exposed to frontend

See [docs/AI_SETUP.md](docs/AI_SETUP.md) for AI/ML setup instructions.
See [docs/ml-setup.md](docs/ml-setup.md) for ML model, data, and API details.

## Validation

```bash
cd backend
npm test
cd ..
python ml/test_pipeline.py
```

The backend test checks that all local relative imports resolve. The Python command
runs the four ML risk scenarios. Build and lint the frontend from the repository root
with `npm run build` and `npm run lint`.
