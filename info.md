# byeFat - Instrucțiuni Proiect

## Descriere

byeFat este o aplicație web PWA (Progressive Web App) pentru tracking calorii și nutriție, construită cu Next.js 15, Firebase, și Google Gemini AI.

## 🚀 Tehnologii Utilizate

- **Frontend:** Next.js 15.5.9, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Firebase (Auth, Firestore), Genkit AI
- **AI:** Google Gemini 1.5 Pro pentru calcul porții
- **API:** Open Food Facts pentru scanare produse
- **PWA:** Next-PWA pentru suport offline

## 📋 Cerințe Preliminare

- Node.js v18 sau mai nou
- npm (vine cu Node.js)

## 🔧 Instalare Locală

1. **Clonează repository-ul:**
   ```bash
   git clone https://github.com/kucsor/byeFat.git
   cd byeFat
   ```

2. **Instalează dependențele:**
   ```bash
   npm install
   ```

3. **Configurează variabilele de mediu:**
   
   Creează un fișier `.env.local` în root-ul proiectului cu:
   ```env
   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Rulează aplicația în modul development:**
   ```bash
   npm run dev
   ```
   
   Aplicația va fi disponibilă la: http://localhost:9002

## 📦 Scripts Disponibile

| Comandă | Descriere |
|---------|-----------|
| `npm run dev` | Pornește serverul de development cu Turbopack |
| `npm run build` | Build pentru producție |
| `npm run start` | Pornește aplicația în modul producție |
| `npm run lint` | Verifică codul cu ESLint |
| `npm run typecheck` | Verifică tipurile TypeScript |

## 🔥 Configurare Firebase

Proiectul folosește Firebase App Hosting care injectează automat credențialele în producție.

**Pentru development local:** Configurația este citită din variabile de mediu (`.env.local`).

**Variabile necesare:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 🤖 Configurare Google Gemini AI

Modelul AI folosit: `googleai/gemini-2.0-flash`

**Variabilă de mediu necesară:**
- `GEMINI_API_KEY` - Cheia API de la Google AI Studio (https://makersuite.google.com/app/apikey)

## 🌐 Deployment pe Vercel

### Pași:

1. **Push codul pe GitHub** (deja configurat)

2. **Accesează Vercel** (https://vercel.com)

3. **Click "Add New Project"**

4. **Importă din GitHub:**
   - Selectează `kucsor/byeFat`

5. **Configurare Project:**
   - **Vercel Team:** kuxor's projects
   - **Project Name:** byeFat
   - **Framework Preset:** Next.js (selectat automat)
   - **Root Directory:** ./ (root)

6. **Environment Variables:**
   
   Adaugă toate variabilele:
   ```
   Key: GEMINI_API_KEY
   Value: your_gemini_api_key_here
   
   Key: NEXT_PUBLIC_FIREBASE_API_KEY
   Value: your_firebase_api_key_here
   
   Key: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   Value: studio-8995176861-f1dfd.firebaseapp.com
   
   Key: NEXT_PUBLIC_FIREBASE_PROJECT_ID
   Value: studio-8995176861-f1dfd
   
   Key: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   Value: 900374376666
   
   Key: NEXT_PUBLIC_FIREBASE_APP_ID
   Value: 1:900374376666:web:d05874caba74a32eb635e3
   
   Key: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
   Value: (poate fi lăsat gol)
   ```

7. **Click "Deploy"**

### Build Settings (opțional):

| Setare | Valoare |
|--------|---------|
| Build Command | `next build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

## ⚠️ Probleme Rezolvate

### 1. Model AI Inexistent ❌ → ✅
**Problema:** Modelul `gemini-3-pro-preview` nu există.
**Soluție:** Schimbat în `gemini-2.0-flash`.

### 2. Script Build Incompatibil Windows ❌ → ✅
**Problema:** `NODE_ENV=production` nu funcționează pe Windows.
**Soluție:** Eliminat prefixul, Next.js setează automat NODE_ENV.

### 3. Securitate Firebase ✅
**Rezolvat:** Credențialele Firebase au fost mutate din cod în variabile de mediu pentru securitate maximă.

## 🔍 Funcționalități Principale

1. **Autentificare** - Firebase Auth
2. **Tracking Calorii** - Adăugare mese, calcul automat
3. **Scanare Produse** - Barcode scanner via Open Food Facts API
4. **Calculator Porții AI** - Genkit + Gemini pentru calcul nutrițional complex
5. **Progress Tracking** - Grafice și istoric greutate
6. **Profil Utilizator** - Setări personale și obiective
7. **PWA** - Funcționează offline, instalabilă pe mobil

## 📁 Structura Proiectului

```
byeFat/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # Pagina principală
│   │   ├── actions/      # Server Actions
│   │   └── ...
│   ├── components/       # Componente React
│   │   ├── app/          # Componente aplicație
│   │   └── ui/           # Componente UI (shadcn)
│   ├── firebase/         # Configurare Firebase
│   ├── ai/               # Configurare Genkit AI
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilități și tipuri
├── public/               # Fișiere statice și PWA
├── docs/                 # Documentație
└── ...
```

## 🐛 Troubleshooting

### Eroare "Module not found"
```bash
npm install
```

### Eroare la build TypeScript
```bash
npm run typecheck
```

### Eroare Firebase
Verifică dacă fișierul `src/firebase/config.ts` există și are configurația corectă.

## 📞 Suport

Pentru probleme sau întrebări, deschide un issue pe GitHub:
https://github.com/kucsor/byeFat/issues

---

**Ultima actualizare:** 31 Ianuarie 2026
**Autor:** kuxor