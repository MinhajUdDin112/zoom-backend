# Zoom Cars Backend

NestJS backend for the Zoom Cars platform. It provides authentication, users, drivers, rides, vehicles, pricing, zones, payments, notifications, communications, and related administration APIs.

## Stack

- Node.js 18+
- NestJS 8
- PostgreSQL with TypeORM
- JWT authentication
- Swagger API documentation
- Firebase Admin, AWS S3, Stripe, Twilio, Pusher, Gmail, and Redis integrations

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL 12+

Docker and Docker Compose are also supported.

## Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a `.env` file in the project root. At minimum, configure:

   ```env
   NODE_ENV=development
   PORT=3000
   HOST=localhost

   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=zoom_cars
   POSTGRES_SSL=false
   POSTGRES_SCHEMA=public

   PRIVATE_KEY=your-private-key
   PUBLIC_KEY=your-public-key
   SECRET_KEY=your-jwt-secret
   EXPIRATION_TIME=1d
   SALT_ROUNDS=10
   ```

   Add credentials for any integrations used by the application, such as Firebase, AWS S3, Stripe, Twilio, Pusher, Gmail, Google Maps, and Redis.

3. Start the API:

   ```bash
   npm run start:dev
   ```

The API listens on `http://localhost:3000` by default. Swagger is available at [`/swagger`](http://localhost:3000/swagger).

## Docker

The Compose setup starts the API and PostgreSQL:

```bash
docker compose up --build
```

Compose expects the same `.env` file in the repository root.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run start:dev` | Start with file watching |
| `npm run build` | Compile the application to `dist/` |
| `npm run start:prod` | Run the compiled application |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Generate test coverage |
| `npm run format` | Format source and test files |
| `npm run lint` | Fix lint issues |
| `npm run schema:sync` | Synchronize the TypeORM schema |
| `npm run apply:migration` | Run database migrations |

## Project structure

Feature modules live under `src/`, including `auth`, `users`, `driver`, `rides`, `vehicles`, `tarrifs`, `templates`, `stripe`, `twilio`, `notification`, `transaction`, and `zone`. Entities, DTOs, controllers, and services are kept with their feature modules.

## Security

Do not commit `.env` files, Firebase credentials, service-account JSON files, private keys, or other secrets. The application expects Firebase Admin credentials at runtime.

## Deployment

The included `Procfile` runs:

```bash
npm run start:prod
```
