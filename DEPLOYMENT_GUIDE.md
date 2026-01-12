# 🚀 Deployment Guide: Vercel & Render

This guide outlines the steps to deploy the **School Management System** (Next.js Frontend & Node.js Backend).

## 📋 Architecture Overview
- **Frontend**: Next.js (Deployed on [Vercel](https://vercel.com))
- **Backend**: Node.js/Express (Deployed on [Render](https://render.com))
- **Database**: MongoDB Atlas (Cloud Database)

---

## 🛠 Part 1: Backend Deployment (Render)

Render is excellent for hosting Node.js APIs as it provides easy SSL, auto-deploys from GitHub, and a generous free tier.

### 1. Prepare your Backend
Ensure your `backend/package.json` has the correct start script:
```json
"scripts": {
  "start": "node src/server.js"
}
```

### 2. Create a Web Service on Render
1.  Log in to [Render.com](https://render.com).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub repository.
4.  **Configure the Service**:
    *   **Name**: `school-mgmt-api`
    *   **Root Directory**: `backend` (CRITICAL: Since your repo is a monorepo)
    *   **Environment**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
    *   **Plan**: `Free` (or as per your choice)

### 3. Set Environment Variables
In the Render dashboard, go to the **Environment** tab and add:
- `MONGODB_URI`: Your MongoDB Atlas connection string.
- `JWT_SECRET`: A long random string.
- `PORT`: `10000` (Render's default) or leave blank as Render handles it.
- `NODE_ENV`: `production`

---

## 🎨 Part 2: Frontend Deployment (Vercel)

Vercel is the natural home for Next.js, offering the best performance and features like Edge functions.

### 1. Create a Project on Vercel
1.  Log in to [Vercel.com](https://vercel.com).
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  **Configure Project**:
    *   **Framework Preset**: `Next.js`
    *   **Root Directory**: `frontend` (Click "Edit" next to the root directory and select the `frontend` folder)
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `.next`

### 2. Set Environment Variables
Before clicking "Deploy", add the following variables:
- `NEXT_PUBLIC_API_URL`: The URL of your Render backend (e.g., `https://school-mgmt-api.onrender.com/api`)

---

## 🔗 Part 3: Connecting Frontend & Backend

Once both are deployed, you must ensure they can talk to each other.

### 1. Update CORS in Backend
Your backend must allow requests from your Vercel domain. In `backend/src/server.js` (or your middleware file):

```javascript
// Example CORS config
const cors = require('cors');
app.use(cors({
  origin: ['https://your-frontend-domain.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```

### 2. Update API Base URL
Ensure your frontend uses the environment variable for all API calls:
```javascript
// frontend/src/lib/axios.js or similar
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
});
```

---

## 🏗 Part 4: Database (MongoDB Atlas)

Since you are using MongoDB, you don't "deploy" it to Render. Instead:
1.  Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  In **Network Access**, allow access from **Everywhere (0.0.0.0/0)** because Render's free tier IPs change frequently.
3.  Copy the connection string and paste it as `MONGODB_URI` in Render.

---

## ✅ Deployment Checklist
- [ ] Backend: Root directory set to `backend`.
- [ ] Backend: `MONGODB_URI` added to Render.
- [ ] Backend: CORS allows your Vercel URL.
- [ ] Frontend: Root directory set to `frontend`.
- [ ] Frontend: `NEXT_PUBLIC_API_URL` set to Render API URL.
- [ ] Frontend: Build succeeds on Vercel.

---

*Need help? Check the [Vercel Documentation](https://vercel.com/docs) and [Render Documentation](https://render.com/docs).*
