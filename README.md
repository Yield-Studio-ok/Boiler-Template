# Boiler-Template

Monorepo fullstack: **Next.js 16** (frontend) + **NestJS 11** (API) + **PostgreSQL 16** + **Firebase Auth** (producción).

Pensado para clonar y arrancar un proyecto nuevo en minutos. Dockerizado para desarrollo (hot reload) y producción (builds optimizados).

---

## Stack completo

| Capa             | Tecnología                                  | Versión    |
| ---------------- | ------------------------------------------- | ---------- |
| Frontend         | Next.js (App Router, standalone output)     | 16.2.x     |
| React            | React + React DOM                           | 19.1.x     |
| Backend          | NestJS (Express adapter)                    | 11.1.x     |
| ORM              | Prisma Client + Prisma CLI                  | 6.19.x     |
| Base de datos    | PostgreSQL (Alpine)                         | 16         |
| Auth (prod)      | Firebase Admin SDK                          | 13.8.x     |
| Auth (dev)       | JWT local (`@nestjs/jwt`) + bcrypt          | 11.x       |
| Validación       | class-validator + class-transformer         | 0.14.x     |
| Documentación    | Swagger (`@nestjs/swagger`)                 | 11.1.x     |
| Rate limiting    | `@nestjs/throttler`                         | 6.4.x      |
| Seguridad HTTP   | Helmet                                      | 8.1.x      |
| Linter           | Oxlint                                      | 1.79.x     |
| Formatter        | Oxfmt                                       | 0.64.x     |
| Git hooks        | Lefthook                                    | 2.1.x      |
| Package manager  | pnpm (workspaces)                           | 10.24.0    |
| Runtime          | Node.js                                     | ≥ 20.9.0   |
| Containerización | Docker Compose                              | v2         |

---

## Estructura del proyecto

```
.
├── package.json                 # Workspace root — scripts globales (dev, start, lint, fmt, typecheck)
├── pnpm-workspace.yaml          # Define workspaces: apps/*
├── pnpm-lock.yaml               # Lockfile único para todo el monorepo
├── .env.example                 # Variables de entorno — copiar a .env
├── docker-compose.yml           # Desarrollo: hot reload, Postgres publicado al host
├── docker-compose.prod.yml      # Producción: builds optimizados, Postgres solo en red interna
├── lefthook.yml                 # Git hooks: oxfmt + oxlint en pre-commit, typecheck en pre-push
├── .oxlintrc.json               # Configuración de Oxlint
├── .oxfmtrc.json                # Configuración de Oxfmt
├── .npmrc                       # Configuración de npm/pnpm
├── .dockerignore                # Archivos excluidos del contexto de Docker
├── .gitignore                   # Archivos excluidos de Git
├── docs/
│   └── nest-swagger-orpc.md     # Documentación: por qué NestJS + Swagger y no oRPC/tRPC
├── apps/
│   ├── api/                     # ── Backend (NestJS) ──
│   │   ├── package.json         # @boilerplate/api — deps: NestJS, Prisma, Firebase Admin, etc.
│   │   ├── nest-cli.json        # Configuración del CLI de NestJS
│   │   ├── tsconfig.json        # TypeScript config del API
│   │   ├── Dockerfile.dev       # Imagen de desarrollo (hot reload con nest start --watch)
│   │   ├── Dockerfile.prod      # Imagen de producción (nest build → node dist/main)
│   │   ├── docker-entrypoint.sh # Entrypoint: corre prisma migrate deploy + prisma generate antes de iniciar
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Schema de la DB — modelo User (id, email, password, name, role)
│   │   │   └── migrations/      # Migraciones de Prisma (init: tabla users)
│   │   └── src/
│   │       ├── main.ts          # Bootstrap: Helmet, CORS, ValidationPipe, Swagger, listen en PORT
│   │       ├── app.module.ts    # Root module: PrismaModule, AuthModule, ThrottlerGuard global, AuthGuard global
│   │       ├── health.controller.ts  # GET /health — SELECT 1 a Postgres (público)
│   │       ├── prisma/
│   │       │   ├── prisma.module.ts   # Módulo global de Prisma
│   │       │   └── prisma.service.ts  # PrismaService: extiende PrismaClient, onModuleInit → $connect
│   │       ├── types/
│   │       │   └── express.d.ts       # Extiende Express Request con `user: AuthUser`
│   │       └── modules/
│   │           └── auth/
│   │               ├── auth.module.ts       # AuthModule: registra JWT, Firebase, AuthService, controllers
│   │               ├── auth.guard.ts        # AuthGuard global: verifica Bearer token (JWT o Firebase)
│   │               ├── auth.service.ts      # AuthService: login (demo), verifyToken, seed de demo users
│   │               ├── auth.controller.ts   # POST /auth/login — solo activo en dev mode
│   │               ├── me.controller.ts     # GET /me — devuelve el user autenticado
│   │               ├── firebase.service.ts  # FirebaseService: inicializa Admin SDK, verifyIdToken
│   │               ├── public.decorator.ts  # @Public() — marca endpoints como públicos (skip auth)
│   │               ├── auth.types.ts        # Interface AuthUser { uid, email, role }
│   │               └── dto/
│   │                   └── login.dto.ts     # LoginDto: email (IsEmail) + password (IsString, MinLength)
│   └── web/                     # ── Frontend (Next.js) ──
│       ├── package.json         # @boilerplate/web — deps: Next.js, React, React DOM
│       ├── tsconfig.json        # TypeScript config del frontend
│       ├── next.config.ts       # output: "standalone" — build optimizado para Docker
│       ├── next-env.d.ts        # Types de Next.js (auto-generado)
│       ├── Dockerfile.dev       # Imagen de desarrollo (next dev)
│       ├── Dockerfile.prod      # Imagen de producción (next build → next start)
│       ├── public/
│       │   └── .gitkeep         # Placeholder para archivos estáticos
│       ├── app/
│       │   ├── layout.tsx       # Root layout: envuelve toda la app con AuthProvider
│       │   ├── page.tsx         # Página principal: formulario de login / vista de usuario logueado
│       │   └── globals.css      # Estilos globales
│       └── lib/
│           ├── api.ts           # apiFetch<T>(): wrapper de fetch con Bearer token y error handling
│           └── auth-context.tsx # AuthProvider + useAuth(): login, logout, hydrate desde localStorage
```

---

## Requisitos previos

- **Node.js** ≥ 20.9.0
- **pnpm** ≥ 10.x (`corepack enable && corepack prepare pnpm@10.24.0 --activate`)
- **Docker** + **Docker Compose** v2

---

## Quick start (desarrollo)

```bash
# 1. Clonar el repo
git clone https://github.com/Yield-Studio-ok/Boiler-Template.git
cd Boiler-Template

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Instalar dependencias (necesario para Lefthook y herramientas locales)
pnpm install

# 4. Levantar todo con Docker (Postgres + API + Web)
pnpm dev
```

Esto ejecuta `docker compose up --build`, que:
1. Levanta **PostgreSQL 16** con las credenciales del `.env`
2. Levanta la **API** (NestJS) — ejecuta migraciones de Prisma automáticamente, seedea demo users
3. Levanta el **frontend** (Next.js) — espera a que la API esté healthy

### URLs de desarrollo

| Servicio    | URL                             |
| ----------- | ------------------------------- |
| Frontend    | `http://localhost:3000`         |
| API         | `http://localhost:3001`         |
| Swagger UI  | `http://localhost:3001/api/docs`|
| Health check| `http://localhost:3001/health`  |

Los puertos son configurables via `.env` (`PUERTO_FRONTEND`, `PUERTO_BACKEND`, `PUERTO_POSTGRES`).

---

## Variables de entorno

Todas las variables están documentadas en `.env.example`:

```bash
# ── PostgreSQL ──
POSTGRES_USER=postgres          # Usuario de la base de datos
POSTGRES_PASSWORD=postgres      # Password de la base de datos
POSTGRES_DB=boilerplate         # Nombre de la base de datos

# ── Puertos ──
PUERTO_BACKEND=3001             # Puerto del API (NestJS)
PUERTO_FRONTEND=3000            # Puerto del frontend (Next.js)
PUERTO_POSTGRES=5432            # Puerto de Postgres (solo expuesto en dev)

# ── NestJS ──
JWT_SECRET=cambiar-por-secret-seguro   # Firma los JWT del login demo. En prod también tiene que estar seteado
CORS_ORIGIN=http://localhost:3000      # URL del frontend. Varias origins separadas por coma

# ── Next.js ──
NEXT_PUBLIC_API_URL=http://localhost:3001   # URL del API (usada en el browser)

# ── Firebase Admin (solo producción) ──
# Montar el JSON de service account como volumen en docker-compose.prod.yml
# Si el archivo falta o es inválido en producción, la API NO arranca
```

---

## API: endpoints

| Método | Path          | Auth           | Descripción                                                               |
| ------ | ------------- | -------------- | ------------------------------------------------------------------------- |
| `POST` | `/auth/login` | No (público)   | Login con email/password → JWT. **Solo funciona en dev mode** (sin Firebase) |
| `GET`  | `/me`         | Bearer token   | Devuelve el usuario autenticado: `{ uid, email, role }`                   |
| `GET`  | `/health`     | No (público)   | Health check — hace `SELECT 1` a PostgreSQL                              |
| `GET`  | `/api/docs`   | No (público)   | Swagger UI — **solo disponible en desarrollo** (`NODE_ENV !== production`) |

### Request/Response de ejemplo

**Login (dev mode):**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@admin.com", "password": "admin123"}'
```

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "cm4x...",
    "email": "admin@admin.com",
    "role": "admin"
  }
}
```

**Obtener usuario actual:**
```bash
curl http://localhost:3001/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

```json
{
  "uid": "cm4x...",
  "email": "admin@admin.com",
  "role": "admin"
}
```

---

## Usuarios demo (dev mode)

Sin credenciales de Firebase, la API corre en **dev mode**. Al iniciar, upserta estos usuarios en la tabla `users` (passwords hasheados con bcrypt):

| Email             | Password   | Role    |
| ----------------- | ---------- | ------- |
| `admin@admin.com` | `admin123` | `admin` |
| `user@user.com`   | `user123`  | `user`  |

El frontend muestra un formulario de login que envía email/password al API, guarda el JWT en `localStorage`, y revalida con `GET /me` al cargar.

---

## Cómo funciona la autenticación

Todos los endpoints están protegidos por un **AuthGuard global** (`APP_GUARD`). Para marcar un endpoint como público, usar el decorator `@Public()`.

### Dev mode (default — sin Firebase)

```
Browser → POST /auth/login { email, password }
                    ↓
              AuthService.login()
                    ↓
         Busca user en DB (Prisma) → bcrypt.compare
                    ↓
         Firma JWT con JWT_SECRET → { sub, email, role }
                    ↓
              { accessToken, user }
                    ↓
Browser guarda token en localStorage
                    ↓
Browser → GET /me (Authorization: Bearer <jwt>)
                    ↓
              AuthGuard.canActivate()
                    ↓
         AuthService.verifyToken() → jwt.verify con JWT_SECRET
                    ↓
              request.user = { uid, email, role }
```

### Production mode (con Firebase)

1. El browser usa el **Firebase Web SDK** para autenticarse (signInWithEmailAndPassword, Google, etc.)
2. Obtiene un **Firebase ID Token** del SDK
3. Lo envía como `Authorization: Bearer <firebase-id-token>`
4. El API verifica el token con **Firebase Admin SDK** (`verifyIdToken`)
5. `POST /auth/login` queda **deshabilitado** — devuelve 400

> **⚠️ En producción, si faltan credenciales de Firebase (`GOOGLE_APPLICATION_CREDENTIALS`), la API no arranca. No hay fallback a demo auth.**

### Configurar Firebase para producción

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Generar service account JSON: Project Settings → Service Accounts → Generate new private key
3. Colocar el JSON en `../../shared/firebase-credentials.json` (relativo al directorio del release)
4. El `docker-compose.prod.yml` ya lo monta:
   ```yaml
   api:
     volumes:
       - ../../shared/firebase-credentials.json:/app/credentials.json:ro
     environment:
       GOOGLE_APPLICATION_CREDENTIALS: /app/credentials.json
   ```
5. Instalar Firebase Web SDK en el frontend:
   ```bash
   pnpm --filter @boilerplate/web add firebase
   ```
6. Crear `apps/web/lib/firebase.ts`:
   ```ts
   import { initializeApp } from "firebase/app";
   import { getAuth } from "firebase/auth";

   const firebaseConfig = {
     apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
     authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
     projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
     storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   ```
7. Actualizar `auth-context.tsx` para usar `signInWithEmailAndPassword(auth, email, password)` y enviar `user.getIdToken()` como Bearer
8. Agregar las variables `NEXT_PUBLIC_FIREBASE_*` al `.env` y al `docker-compose.prod.yml`

### Uso del AuthGuard en código

```ts
import { Public } from './modules/auth/public.decorator';

// Endpoint público (no requiere token)
@Public()
@Get('health')
async health() { ... }

// Endpoint protegido (requiere Bearer token — es el default)
@Get('me')
async me(@Req() req: Request) {
  return req.user; // { uid, email, role }
}
```

---

## Base de datos (Prisma)

### Schema (`apps/api/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      String   @default("user")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

### Comandos de Prisma

```bash
# Abrir Prisma Studio (visual DB browser)
docker compose exec api npx prisma studio

# Crear una nueva migración
docker compose exec api npx prisma migrate dev --name mi_migracion

# Regenerar el Prisma Client
docker compose exec api npx prisma generate
```

> **Nota:** En desarrollo, Postgres se publica en el puerto `PUERTO_POSTGRES` para que Prisma Studio pueda conectarse. En producción, Postgres solo está en la red interna de Docker.

---

## Docker

### Desarrollo (`docker-compose.yml`)

- **Hot reload**: el código fuente se monta como volumen (changes → rebuild automático)
- **Postgres expuesto** en `PUERTO_POSTGRES` para acceso directo (Prisma Studio, psql, etc.)
- El API espera a que Postgres esté healthy antes de arrancar
- El frontend espera a que el API esté healthy antes de arrancar

### Producción (`docker-compose.prod.yml`)

- **Builds optimizados**: multi-stage Dockerfiles
  - API: `nest build` → `node dist/main`
  - Web: `next build` → standalone output
- **Postgres NO publicado** al host (solo accesible dentro de la red Docker `app-network`)
- Firebase credentials montadas como volumen read-only
- Healthchecks en todos los servicios

```bash
# Build y levantar producción
pnpm start
# equivale a: docker compose -f docker-compose.prod.yml up --build

# Solo build (sin levantar)
pnpm build

# Ver logs en producción
docker compose -f docker-compose.prod.yml logs -f
```

---

## Code quality

### Lefthook (git hooks)

Configurado en `lefthook.yml`:

| Hook         | Acción                                                                     |
| ------------ | -------------------------------------------------------------------------- |
| `pre-commit` | **oxfmt** (formatea archivos staged) → **oxlint** (lintea archivos staged) |
| `pre-push`   | **typecheck** (compila TypeScript sin emitir)                              |

Se instala automáticamente con `pnpm install` (script `prepare`).

### Herramientas

| Herramienta | Qué hace                           | Comando         |
| ----------- | ---------------------------------- | --------------- |
| Oxlint      | Linter ultra-rápido (Rust-based)   | `pnpm lint`     |
| Oxfmt       | Formatter ultra-rápido (Rust-based)| `pnpm fmt`      |
| TypeScript  | Type checking sin emitir           | `pnpm typecheck`|

---

## Todos los comandos

```bash
# ── Desarrollo ──
pnpm dev                # Levanta todo (docker compose up --build)
pnpm install            # Instala dependencias + Lefthook hooks

# ── Producción ──
pnpm start              # Build y levanta producción (docker-compose.prod.yml)
pnpm build              # Solo build de producción

# ── Build individual de apps ──
pnpm build:apps         # Build API + Web sin Docker

# ── Code quality ──
pnpm lint               # Oxlint en todo el repo
pnpm fmt                # Oxfmt (formatear)
pnpm fmt:check          # Oxfmt check (no modifica, solo reporta)
pnpm typecheck          # TypeScript --noEmit en API y Web

# ── Base de datos ──
docker compose exec api npx prisma studio          # Visual DB browser
docker compose exec api npx prisma migrate dev      # Crear migración
docker compose exec api npx prisma generate         # Regenerar client

# ── Logs ──
docker compose logs -f                              # Logs en dev
docker compose -f docker-compose.prod.yml logs -f   # Logs en prod
```

---

## Seguridad

- **Helmet**: headers de seguridad HTTP. `contentSecurityPolicy` habilitado solo en producción
- **CORS**: configurable via `CORS_ORIGIN`. En dev se agregan `localhost:3000` y `127.0.0.1:3000` automáticamente
- **ValidationPipe global**: `whitelist: true`, `forbidNonWhitelisted: true` — rechaza propiedades no declaradas en los DTOs
- **ThrottlerGuard global**: rate limiting en todos los endpoints
- **bcrypt**: passwords hasheados con salt rounds = 10
- **JWT**: tokens firmados con `JWT_SECRET` (dev) o verificados con Firebase Admin (prod)
- **Swagger deshabilitado en producción**: no expone documentación interna

---

## Frontend: cómo funciona

El frontend es un Next.js 16 con App Router:

- **`layout.tsx`**: envuelve toda la app con `<AuthProvider>` (React Context)
- **`page.tsx`**: si no hay usuario logueado, muestra formulario de login. Si hay usuario, muestra info + botón de logout
- **`lib/api.ts`**: `apiFetch<T>()` — wrapper de `fetch` que:
  - Agrega `Content-Type: application/json`
  - Agrega `Authorization: Bearer <token>` si se pasa un token
  - Parsea errores del API y lanza `ApiError` con status code
- **`lib/auth-context.tsx`**: `AuthProvider` + hook `useAuth()`:
  - `login(email, password)`: POST a `/auth/login`, guarda token en localStorage
  - `logout()`: borra token de localStorage
  - Al cargar: si hay token en localStorage, hace `GET /me` para rehidratar el usuario
  - Si el token es inválido, hace logout automático

---

## Documentación adicional

- [docs/nest-swagger-orpc.md](docs/nest-swagger-orpc.md) — Explica la decisión de arquitectura: por qué NestJS + Bearer + Swagger y no oRPC/tRPC como default del boilerplate
