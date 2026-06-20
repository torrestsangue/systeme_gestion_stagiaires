# SGS — Système de Gestion des Stagiaires

Plateforme fullstack pour gérer le cycle de vie complet des stagiaires :
inscriptions, suivi, présences (QR dynamique), paiements, évaluations,
attestations.

## Stack

- **Backend** : NestJS 10 + Prisma + PostgreSQL + JWT
- **Frontend** : React 18 + TypeScript + Vite + Tailwind + Zustand + React Router + Axios

## Structure

```
monprojet/
├── backend/     ← API NestJS (port 3000)
├── frontend/    ← UI React Vite (port 5173)
└── README.md
```

## Démarrage rapide

### 1. Prérequis

- Node.js >= 18
- npm ou pnpm
- PostgreSQL >= 14 (local ou Docker)

### 2. Base de données PostgreSQL

Avec Docker (recommandé) :

```bash
docker run --name sgs-pg -e POSTGRES_USER=sgs -e POSTGRES_PASSWORD=sgs -e POSTGRES_DB=sgs -p 5432:5432 -d postgres:16
```

Ou installe PostgreSQL en local et crée la base `sgs`.

### 3. Backend (NestJS)

```bash
cd backend
cp .env.example .env       # ajuste DATABASE_URL et JWT_SECRET si besoin
npm install
npx prisma migrate dev --name init
npm run seed               # crée un compte super admin
npm run start:dev          # http://localhost:3000
```

Compte par défaut créé par le seed :

- **Email** : `admin@sgs.local`
- **Mot de passe** : `Admin@123`
- **Rôle** : `SUPER_ADMIN`

### 4. Frontend (React Vite)

Dans un autre terminal :

```bash
cd frontend
cp .env.example .env       # VITE_API_URL=http://localhost:3000
npm install
npm run dev                # http://localhost:5173
```

Va sur http://localhost:5173, connecte-toi avec le compte admin ci-dessus.

## Endpoints API principaux

| Méthode | URL                          | Rôle requis        |
|---------|------------------------------|--------------------|
| POST    | /auth/register               | Public             |
| POST    | /auth/login                  | Public             |
| GET     | /auth/me                     | Authentifié        |
| GET     | /users                       | ADMIN_RH+          |
| GET     | /stagiaires                  | TUTEUR+            |
| POST    | /inscriptions                | Public             |
| GET     | /inscriptions                | ADMIN_RH+          |
| PATCH   | /inscriptions/:id/valider    | ADMIN_RH+          |
| GET     | /taches                      | Authentifié        |
| POST    | /taches                      | TUTEUR+            |
| POST    | /rapports                    | STAGIAIRE          |
| POST    | /presences/generer-qr        | ADMIN_RH+          |
| POST    | /presences/scanner           | STAGIAIRE          |
| GET     | /paiements                   | ADMIN_RH+          |
| POST    | /evaluations                 | TUTEUR+            |

## Rôles

- `SUPER_ADMIN` — accès total
- `ADMIN_RH` — validation, paiements, RH
- `TUTEUR` — suivi de ses stagiaires
- `STAGIAIRE` — espace personnel

## Scripts utiles

Backend :
- `npm run start:dev` — dev avec hot reload
- `npm run build` && `npm run start:prod` — prod
- `npx prisma studio` — interface DB
- `npx prisma migrate dev` — nouvelle migration

Frontend :
- `npm run dev` — dev
- `npm run build` — build prod
- `npm run preview` — preview du build

## Notes

- Les uploads de fichiers vont dans `backend/uploads/`.
- Le QR code de présence est régénéré toutes les 90 secondes (configurable
  dans `presences.service.ts`).
- En production : change `JWT_SECRET`, active HTTPS, configure CORS au domaine
  réel dans `backend/src/main.ts`.


Super admin créé : admin@sgs.local / mot de passe : Admin@123
Tuteur créé : tuteur@sgs.local / Tuteur@123

## pour fournir le jwt
pour fournir le jwt : node -e "console.log(require('crypto').randomBytes(64).toString('hex'))".toString('hex')"