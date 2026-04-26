# Smart Transport Management System (STMS)

A production-grade MERN-based Smart Transport Management System with AI-powered route optimization and fuel prediction.

## 🏗️ Architecture

```
React (Vite + Tailwind)  →  Node.js / Express API  →  MongoDB
                                    ↓
                        Python (FastAPI) AI Microservice
```

## 📦 Modules

- **Authentication** — JWT-based, roles: `admin`, `manager`, `driver`
- **Vehicles** — CRUD, status tracking (active / idle / maintenance)
- **Drivers** — CRUD, availability
- **Shipments** — Full lifecycle (booked → assigned → in_transit → delivered)
- **AI Service** — Route distance + ML-based fuel prediction
- **Dashboard** — KPIs, recent shipments, fleet status

## 🗂️ Project structure

```
stms/
├── backend/        Node.js + Express + MongoDB
├── frontend/       React (Vite) + Tailwind CSS
└── ai-service/     Python FastAPI + scikit-learn
```

---

## 🚀 Setup (without Docker)

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- MongoDB (local or Atlas cloud URI)

### 1. Clone & install

```bash
# Backend
cd backend
cp .env.example .env       # edit MONGO_URI, JWT_SECRET
npm install

# Frontend
cd ../frontend
cp .env.example .env       # edit VITE_API_URL if needed
npm install

# AI service
cd ../ai-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the three services (three terminals)

```bash
# Terminal 1 — MongoDB (if local)
mongod

# Terminal 2 — AI service (port 8000)
cd ai-service
source venv/bin/activate
python app.py

# Terminal 3 — Backend (port 5000)
cd backend
npm run dev

# Terminal 4 — Frontend (port 5173)
cd frontend
npm run dev
```

### 3. Seed an admin user

```bash
cd backend
npm run seed
```

Default admin: `admin@stms.com` / `Admin@123`

### 4. Open

Visit **http://localhost:5173** → log in as admin.

---

## 🔌 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/vehicles` | List / create vehicle |
| PUT/DELETE | `/api/vehicles/:id` | Update / delete |
| GET/POST | `/api/drivers` | List / create driver |
| PUT/DELETE | `/api/drivers/:id` | Update / delete |
| GET/POST | `/api/shipments` | List / create shipment |
| PUT | `/api/shipments/:id` | Update shipment |
| PUT | `/api/shipments/:id/status` | Update lifecycle status |
| POST | `/api/ai/route` | Get route distance / duration |
| POST | `/api/ai/fuel` | Predict fuel cost |
| GET | `/api/dashboard/stats` | Dashboard KPIs |

---

## 🤖 AI Service

The Python FastAPI service exposes:

- `POST /predict/fuel` — predicts fuel consumption from `{distance, vehicle_type, load_kg}` using a trained scikit-learn RandomForest regressor (auto-trained from synthetic data on first run, persisted to `model.pkl`).
- `POST /route/estimate` — estimates route distance/duration. Defaults to a great-circle heuristic; plug in Google Maps / OSRM by setting `MAPS_PROVIDER` env.

The Node backend proxies these under `/api/ai/*` so the frontend only talks to one origin.

---

## 🔒 Production notes

- Use strong `JWT_SECRET` (32+ random bytes).
- Put backend + AI behind HTTPS (nginx reverse proxy).
- Set `NODE_ENV=production`; run with `pm2` or systemd.
- For frontend: `npm run build` → serve `dist/` via nginx.
- Enable MongoDB auth and backups.
- Add rate limiting (already wired via `express-rate-limit`).

---

## 📝 License

MIT
