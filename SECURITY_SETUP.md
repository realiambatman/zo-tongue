# 🔒 Security Setup Guide

## ⚠️ CRITICAL: Your API Key Was Exposed!

Your Gemini API key and system instructions were previously exposed in client-side code. This has been fixed by moving all API calls to a secure backend server.

## 🚀 Quick Setup

### 1. Install Backend Dependencies

```bash
cd server
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `server/` directory:

```bash
cd server
cp .env.example .env
```

Then edit `.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_actual_api_key_here
PORT=3001
```

**⚠️ IMPORTANT:** 
- NEVER commit the `.env` file to git
- The `.env` file is already in `.gitignore`
- Use a NEW API key if your old one was exposed (revoke the old one in Google Cloud Console)

### 3. Start the Backend Server

```bash
cd server
npm run dev
```

The server will run on `http://localhost:3001`

### 4. Update Frontend Environment (Optional)

If your backend is on a different URL, create a `.env` file in the root directory:

```
VITE_API_URL=http://localhost:3001/api/gemini
```

### 5. Start the Frontend

```bash
npm run dev
```

## 🔐 What Changed?

### Before (INSECURE ❌):
- API key hardcoded in `services/geminiService.ts`
- System instructions visible in client-side code
- Anyone could view your API key in browser DevTools

### After (SECURE ✅):
- API key stored securely on backend server
- System instructions hidden on server
- Frontend only makes HTTP requests to your backend
- API key never exposed to clients

## 📁 File Structure

```
zotongue-ai/
├── server/                 # NEW: Backend server
│   ├── routes/
│   │   └── gemini.js      # API endpoints (secure)
│   ├── server.js          # Express server
│   ├── package.json
│   └── .env               # API key stored here (NOT in git)
├── services/
│   ├── geminiService.ts   # UPDATED: Now uses API client
│   └── apiClient.ts       # NEW: Frontend API client
└── ...
```

## 🚨 If Your API Key Was Exposed

1. **Revoke the exposed key immediately:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services > Credentials
   - Find your Gemini API key and delete/revoke it

2. **Create a new API key:**
   - Create a new API key in Google Cloud Console
   - Add it to `server/.env`

3. **Restrict the new key:**
   - Set API restrictions to only allow Gemini API
   - Set application restrictions if possible

## 🧪 Testing

1. Start the backend: `cd server && npm run dev`
2. Start the frontend: `npm run dev`
3. Test chat, translation, study, and solver features
4. Check browser DevTools → Network tab - you should see requests to `/api/gemini/*` instead of direct Gemini API calls

## 📝 Deployment

When deploying:

1. **Backend:** Deploy the `server/` directory to a hosting service (Railway, Render, Heroku, etc.)
2. **Set environment variables** on your hosting platform (GEMINI_API_KEY)
3. **Update frontend:** Set `VITE_API_URL` to point to your deployed backend URL
4. **Frontend:** Deploy as usual (Vercel, Netlify, etc.)

## ✅ Security Checklist

- [x] API key moved to backend
- [x] System instructions moved to backend
- [x] Frontend uses API client instead of direct Gemini calls
- [ ] Old exposed API key revoked
- [ ] New API key created and added to `server/.env`
- [ ] Backend server tested and running
- [ ] `.env` file in `.gitignore`

