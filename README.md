# ZoTongue AI

ZoTongue AI is a web app for chatting, translating, studying and solving problems in the Zo family of languages (Paite, Thadou, Hmar, Mizo, Zou, Kom and Gangte) alongside English. This repository is the frontend: a React single-page app that signs users in with Firebase, stores conversations in Firestore, and sends every AI request to a separate backend server that talks to Google Gemini. No model API key is ever shipped to the browser.

## Features

- **Chat** (`/chat`, `/chat/:sessionId`): conversation in a selected language, with saved sessions, Markdown and KaTeX rendering, optional web-search sources, and an optional sarcasm mode.
- **Translator** (`/translate`): translation between any two supported languages.
- **Study** (`/study`): turns pasted text into a summary plus question-and-answer pairs in the target language.
- **Solver** (`/solver`): answers a question, optionally about an uploaded image, in the chosen language.
- **Accounts**: Google sign-in through Firebase Authentication. Visitors who do not sign in are tracked with a locally stored guest id.
- **Profile** (`/profile`): a signed-in user's saved sessions.
- **Admin panel** (`/admin`): restricted to accounts on the admin email domain. Paginated lists of users, guests and sessions, live view of a session, replying as an admin, pausing AI replies per session, deleting sessions or messages, toggling maintenance mode, and exporting conversations as training data (chat messages, SFT, or translation pairs) with date filters and an export history.
- **Maintenance mode**: a Firestore flag that swaps the site for a "service unavailable" page for everyone except admins, applied live to open tabs.

## Tech stack

- React 19, TypeScript, Vite 6
- React Router 7
- Tailwind CSS 3 with `@tailwindcss/typography`
- Firebase 12 (Authentication, Firestore, Analytics)
- Framer Motion (landing page animation)
- react-markdown with remark-gfm, remark-math and rehype-katex

## Prerequisites

- Node.js 20 or newer, and npm
- A Firebase project with Authentication (Google provider) and Firestore enabled
- A running instance of the backend (see below)

## Backend

The AI endpoints live in a separate repository, `zotongue-ai-server`, an Express server that proxies requests to Gemini and holds the API key and system instructions. This frontend expects these routes under the configured base URL:

| Method | Path          | Used by    |
| ------ | ------------- | ---------- |
| POST   | `/chat/send`  | Chat       |
| POST   | `/translate`  | Translator |
| POST   | `/study`      | Study      |
| POST   | `/solve`      | Solver     |

If `VITE_API_URL` is not set, the app uses `http://localhost:3001/api/chat` when served from `localhost`, and `<current origin>/api/chat` anywhere else.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
npm run dev            # http://localhost:3000
```

Production build:

```bash
npm run build          # outputs to dist/
npm run preview        # serves the build locally
```

Because the app uses client-side routing, the host must serve `index.html` for unknown paths.

## Environment variables

All variables are read by Vite at build time and end up in the client bundle, so none of them may hold a secret. The Firebase web config is a public identifier; access is controlled by Firestore rules, not by hiding these values.

| Variable                            | Required | Purpose |
| ----------------------------------- | -------- | ------- |
| `VITE_API_URL`                      | No       | Base URL of the backend chat API, including the `/api/chat` prefix, e.g. `http://localhost:3001/api/chat`. See the defaults above. |
| `VITE_FIREBASE_API_KEY`             | Yes      | Firebase web API key. The app throws on startup if it is missing. |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Yes\*    | Firebase auth domain. |
| `VITE_FIREBASE_PROJECT_ID`          | Yes\*    | Firebase project id. |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Yes\*    | Firebase storage bucket. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes\*    | Firebase messaging sender id. |
| `VITE_FIREBASE_APP_ID`              | Yes\*    | Firebase web app id. |
| `VITE_FIREBASE_MEASUREMENT_ID`      | Yes\*    | Google Analytics measurement id. |

\* If left unset, `services/firebase.ts` falls back to the identifiers of the original ZoTongue Firebase project. Set all of them when running against your own project.

## Firebase setup

1. Create a Firebase project and add a web app. Copy its config into `.env`.
2. In Authentication, enable the **Google** sign-in provider and add your domains (including `localhost`) to the authorised domains.
3. Create a Firestore database. The app uses these collections:

   | Collection            | Contents |
   | --------------------- | -------- |
   | `users`               | One profile per signed-in user (uid, email, display name, photo, last login). |
   | `chats`               | One document per session of any type, including its messages. |
   | `settings`            | `site_maintenance` document holding the maintenance flag. |
   | `adminExportProfiles` | Per-admin export history, keyed by uid. |

4. Firestore will ask for composite indexes on `chats` the first time the relevant queries run (`userId` + `lastUpdated`, and `userEmail` + `lastUpdated`). Create them from the link in the browser console error.
5. Write and deploy security rules (next section).

### Firestore rules

`firestore.rules` is deliberately not tracked in this repository (it is listed in `.gitignore`). `firebase.json` points at a local `firestore.rules` file in the project root, so keep your copy there and deploy it with the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Before deploying, run the check:

```bash
npm run verify:firestore-rules
```

It fails unless the local `firestore.rules` contains a `match /adminExportProfiles/` block and the condition `isAdmin() && isOwner(uid)`, so an admin's export history can only be read and written by that admin. The script needs `grep`, so run it from a Unix-like shell.

Admin access is decided by email domain. The domain is defined once in `constants.ts` (`ADMIN_EMAIL_DOMAIN`) and the `isAdmin()` function in your rules must use the same one. The check in the client only hides the UI; the rules are what actually protect the data.

## Scripts

| Command                          | What it does |
| -------------------------------- | ------------ |
| `npm run dev`                    | Start the Vite dev server on port 3000. |
| `npm run build`                  | Build for production into `dist/`. |
| `npm run preview`                | Serve the production build locally. |
| `npm run verify:firestore-rules` | Sanity-check the local `firestore.rules` (see above). |

Type checking is not wired into a script; run `npx tsc --noEmit`.

## Project structure

```
App.tsx                 Routes and the maintenance-mode guard
index.tsx, index.html   Entry points
index.css               Tailwind layers and global styles
constants.ts            Language list, admin email domain
types.ts                Shared enums and interfaces
components/             Pages and UI (chat, translator, study, solver, profile, admin, landing)
contexts/AuthContext.tsx  Firebase auth state and sign-in helpers
services/firebase.ts    Firebase initialisation from env vars
services/dbService.ts   All Firestore reads and writes
services/apiClient.ts   HTTP client for the backend
services/geminiService.ts  Chat session wrapper and query helpers built on apiClient
utils/thinkBlock.ts     Splits model "thinking" blocks from answer text
firebase.json           Points the Firebase CLI at firestore.rules
```

## Notes and limitations

- Nothing works without the backend; the frontend makes no direct model calls.
- Chat responses arrive from the backend in one piece. The typing effect is simulated in the browser.
- Vaiphei exists in the type definitions but is disabled in the language selector.
- The browser calls a few third-party services directly: `worldtimeapi.org` (with `timeapi.io` as fallback) for the current time in IST, and `api.ipify.org` to record a guest's public IP address on their session. Fonts load from Google Fonts and the KaTeX stylesheet from jsDelivr.
- `@google/genai` is used only for its TypeScript types.
- There is no automated test suite or lint configuration.
