# Nest, Bearer, Swagger y oRPC

Este template no es “un Next con un backend TypeScript”. Es **HTTP REST con NestJS**, un **token Bearer** y **OpenAPI/Swagger** como contrato visible. oRPC resuelve otro problema: procedures TypeScript de punta a punta. Abajo está cómo funciona lo de hoy y dónde oRPC encaja o no.

## Cómo entra un request

```
Browser
  │  Authorization: Bearer <token>
  ▼
Nest (Express)
  1. Helmet / CORS
  2. ValidationPipe (body)
  3. ThrottlerGuard
  4. AuthGuard  ← global, salvo @Public()
  5. Controller
```

El frontend no comparte runtime con la API. `apps/web/lib/api.ts` hace `fetch` a `NEXT_PUBLIC_API_URL`. Los tipos del JSON se escriben a mano en el caller (`auth-context.tsx`).

## Nest: módulos y HTTP

Cada feature es un módulo (`AuthModule`, `PrismaModule`). Los controllers declaran **método + path**:

| Método | Path          | Auth    | Qué hace                                             |
| ------ | ------------- | ------- | ---------------------------------------------------- |
| `POST` | `/auth/login` | Público | Email/password → JWT (solo si Firebase está apagado) |
| `GET`  | `/me`         | Bearer  | Devuelve el user del token                           |
| `GET`  | `/health`     | Público | `SELECT 1` a Postgres                                |
| `GET`  | `/api/docs`   | Público | Swagger UI (solo `NODE_ENV !== production`)          |

`ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`) valida **clases** con `class-validator`. El body de login es `LoginDto`, no un schema Zod.

Eso importa: el contrato de entrada vive en **decorators de clase**, no en un objeto de procedures.

## Bearer: quién sos

`AuthGuard` está registrado como `APP_GUARD`. Todo endpoint nace cerrado.

1. Si el handler o la clase tienen `@Public()`, pasa.
2. Si no, exige `Authorization: Bearer …`.
3. `AuthService.verifyToken`:
   - **Firebase on** (prod, JSON de service account válido): `verifyIdToken`. El Bearer es un **ID token de Firebase**.
   - **Firebase off** (dev): verifica un **JWT** firmado con `JWT_SECRET`.

En producción, si faltan credenciales de Firebase, el proceso **no arranca**. No hay fallback a “el token es el email”.

`POST /auth/login` es el atajo de desarrollo: mira la tabla `users` (bcrypt) y emite el JWT. Con Firebase configurado, ese endpoint se apaga; el browser tiene que obtener el ID token con el SDK de Firebase y mandarlo igual, como Bearer.

El user queda en `request.user` (`uid`, `email`, `role`). `/me` solo lee eso. No hay sesión cookie.

Para Swagger, `DocumentBuilder.addBearerAuth()` documenta el mismo esquema: pegás el token en “Authorize” y las rutas protegidas se pueden probar.

## Swagger: el contrato HTTP

En dev, Nest recorre controllers + DTOs y arma un **OpenAPI**. La UI está en `/api/docs`.

Eso es el contrato **hacia afuera**:

- paths REST reales (`GET /me`, no `me.query()`)
- schemas de body/response si los anotás con `@ApiProperty`
- security Bearer

Cualquier cliente (web, curl, otra app, Postman) habla el mismo HTTP. El Hub y Docker healthchecks también: `GET /health` sin body RPC.

En producción Swagger está apagado a propósito (superficie de ataque y docs internas).

## Qué es oRPC (en una frase)

Definís **procedures** (`auth.login`, `auth.me`) con un schema (casi siempre Zod). El server las implementa; el client TypeScript las llama con tipos inferidos. oRPC además puede **exponer REST + OpenAPI** desde el mismo contrato (`@orpc/nest`, `@orpc/openapi`).

No es “un fetch tipado”. Es **otra forma de escribir la API**: el contrato vive en un router/contract, no en un `@Controller` + `LoginDto`.

## Dónde encaja

| Pieza actual                       | Con oRPC                                                                                      | ¿Suma?                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------- |
| Tipos front/back                   | Inferidos del contract. Se acaba el `{ uid, email, role }` duplicado                          | Sí, ese es el win                       |
| Nest modules / controllers         | `@orpc/nest` puede montar procedures en Nest, pero el estilo deja de ser “un controller REST” | Mixto: Nest queda de host, no de modelo |
| `class-validator` + ValidationPipe | Zod (u otro schema) en el contract. Dos validadores si no migrás todo                         | No, a menos que tires class-validator   |
| Bearer Firebase / JWT              | Se puede: middleware oRPC que lea el header, igual que el guard                               | Neutro: no simplifica auth              |
| `@Public()` + `APP_GUARD`          | Hay que reimplementar “público vs no” en middleware de procedures                             | Neutro / más trabajo                    |
| Swagger Nest                       | oRPC genera OpenAPI propio. Tener **los dos** es doble fuente de verdad                       | No conviven bien                        |
| `GET /health` para Docker/Hub      | Tiene que seguir siendo un GET HTTP normal. Se puede dejar un controller Nest al lado         | Se puede, pero queda híbrido            |
| Template para clonar               | El fork piensa en módulos Nest, DTO, Swagger, Bearer                                          | oRPC cambia qué hay que copiar          |

oRPC **encaja técnicamente** con Nest (hay adapter). Encaja **mal como default de este boilerplate** porque el valor del template es enseñar y deployar **REST + Bearer + Swagger**, que es lo que el Hub, el healthcheck y Firebase ya asumen.

tRPC encaja peor: OpenAPI no es de primera, y este repo **sí** quiere un contrato HTTP documentable.

## Dónde no encaja

- **No reemplaza el AuthGuard.** El token sigue viajando en un header HTTP. oRPC no “loguea” por vos ni habla con Firebase Admin.
- **No es necesario para 3 endpoints.** El drift de tipos se arregla con un `packages/types` o, más adelante, generando types desde el OpenAPI de Nest.
- **No es un plugin de Swagger.** Si dejás `SwaggerModule` **y** el OpenAPI de oRPC, los paths se desfasán. Elegís una fuente de verdad.
- **No mejora el deploy.** El Hub no llama procedures; levanta compose y pega a puertos.

## Si algún día sí

Tendría sentido oRPC cuando:

1. El producto es **solo TypeScript** (esta web + esta API) y el dolor es el client, no Postman/terceros.
2. Aceptás **Zod (o similar) como contrato**, no `LoginDto`.
3. Swagger de Nest **se apaga** y el OpenAPI sale de oRPC, o no te importa documentar REST a mano.
4. Auth queda como **middleware del router** oRPC, no un segundo sistema.

Hasta entonces el camino barato, alineado con lo que ya está, es:

1. Seguir con Nest + Bearer + Swagger (hoy).
2. Si molesta el copy-paste: tipos compartidos.
3. Si el API crece y sigue siendo REST: `openapi-typescript` desde el spec de Nest.

oRPC es un cambio de arquitectura, no un extra de DX encima de este stack.
