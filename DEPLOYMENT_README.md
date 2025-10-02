Auraa Luxury - Manual Setup Guide (GitHub Desktop)

This repository contains a full-stack app: React frontend + FastAPI backend + MongoDB.

1) Prerequisites
- Node.js 18+ and Yarn
- Python 3.10+
- MongoDB (local or remote)
- GitHub Desktop (for pushing to your repo)

2) Environment Variables
- Backend: copy backend/.env.example to backend/.env and set values:
  MONGO_URL=mongodb://localhost:27017
  DB_NAME=auraa_luxury
  CORS_ORIGINS=*

- Frontend: copy frontend/.env.example to frontend/.env and set:
  REACT_APP_BACKEND_URL=http://localhost:8001

3) Install Dependencies
- Backend:
  cd backend
  python -m venv venv
  source venv/bin/activate  (Windows: venv\\Scripts\\activate)
  pip install -r requirements.txt

- Frontend:
  cd frontend
  yarn install

4) Run Locally
- Backend:
  cd backend
  source venv/bin/activate
  uvicorn server:app --host 0.0.0.0 --port 8001 --reload

- Frontend:
  cd frontend
  yarn start

5) First-time Data Init
- Call POST http://localhost:8001/api/init-data to create admin user and seed products.
  Admin credentials:
  email: admin@auraa.com
  password: admin123

6) Notes
- Do not hardcode any URLs. Frontend must use REACT_APP_BACKEND_URL env.
- All backend routes are prefixed with /api.
- MongoDB ObjectId is not used; we use UUID strings.

7) Production
- Adjust .env files for your environment.
- Use a process manager (e.g., pm2 for Node, gunicorn/uvicorn for Python) and serve React build via a static server (e.g., Nginx).
- Remember to configure CORS_ORIGINS and REACT_APP_BACKEND_URL accordingly.
