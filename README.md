# Growbit

**Small progress every day.**

Growbit is a REST API for personal goal and task management. Users can create goals, attach optional tasks, track partial completion, and monitor weighted goal progress and daily progress history.

## Features

- Signup and login with JWT authentication
- Forgot-password and reset-password flows
- Goal creation, updates, deletion, priorities, statuses, and date ranges
- Standalone tasks or tasks linked to a goal
- Task status, priority, estimates, actual time, and partial completion
- Weighted goal progress based on task estimates
- Goal progress recalculation and historical progress logs
- Request validation and consistent response transformation
- Interactive Swagger/OpenAPI documentation
- Dockerized NestJS, PostgreSQL, and pgAdmin development stack

## Tech stack

- NestJS 11 and TypeScript
- PostgreSQL and TypeORM
- Passport, JWT, and bcrypt
- class-validator and class-transformer
- Swagger/OpenAPI
- Jest
- Docker Compose

## Prerequisites

For local development:

- Node.js 26
- Yarn 1.22
- PostgreSQL

Alternatively, install Docker and Docker Compose to run the complete stack.

## Environment configuration

Local development loads `.env.stage.dev` because `yarn start:dev` sets `STAGE=dev`.

```env
DB_HOST=localhost
DB_PORT=5434
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=task-management
JWT_SECRET=replace-with-a-long-random-secret
```

The application validates all required database variables, `STAGE`, and `JWT_SECRET` during startup.

> Do not commit production secrets. Use a separate `.env.stage.prod` or runtime environment variables for production.

## Run locally

Install dependencies:

```bash
yarn install
```

Start PostgreSQL, ensure `.env.stage.dev` is configured, then run:

```bash
yarn start:dev
```

The API runs at `http://localhost:3000` and Swagger UI is available at `http://localhost:3000/api-docs`.

Other useful commands:

```bash
STAGE=dev yarn start # one-time development start
yarn start:debug    # watch mode with debugger
yarn build          # compile the application
yarn start:prod     # run the compiled dist/main entry point
```

## Run with Docker

Start the application, PostgreSQL, and pgAdmin:

```bash
docker compose up --build
```

Run in the background or stop the stack:

```bash
docker compose up --build -d
docker compose down
```

To also remove database and pgAdmin volumes:

```bash
docker compose down -v
```

Default services:

| Service | Address |
| --- | --- |
| Growbit API | `http://localhost:3000` |
| Swagger UI | `http://localhost:3000/api-docs` |
| PostgreSQL | `localhost:5434` |
| pgAdmin | `http://localhost:5050` |

Override host ports when needed:

```bash
APP_HOST_PORT=3001 POSTGRES_HOST_PORT=5435 PGADMIN_HOST_PORT=5051 docker compose up --build
```

### pgAdmin

Sign in with:

```text
Email: admin@example.com
Password: admin
```

Register the Docker PostgreSQL server with:

```text
Host: postgres
Port: 5432
Database: task-management
Username: postgres
Password: postgres
```

## API overview

Authentication endpoints are public. Task and goal endpoints require:

```http
Authorization: Bearer <accessToken>
```

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/auth/signup` | Create an account |
| `POST` | `/auth/login` | Sign in and receive an access token |
| `POST` | `/auth/forgot-password` | Request a password-reset token |
| `POST` | `/auth/reset-password` | Set a new password using the reset token |

### Tasks

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/tasks` | List tasks; filter with `status` and `search` |
| `GET` | `/tasks/:id` | Get one task |
| `POST` | `/tasks` | Create a standalone or goal-linked task |
| `PATCH` | `/tasks/:id/status` | Update task status |
| `PATCH` | `/tasks/:taskId/complete` | Mark a task complete |
| `PATCH` | `/tasks/:taskId/progress` | Update partial progress |
| `DELETE` | `/tasks/:id` | Delete a task |

### Goals

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/goals` | List goals |
| `GET` | `/goals/:id` | Get one goal |
| `POST` | `/goals` | Create a goal |
| `PATCH` | `/goals/:id` | Update a goal |
| `DELETE` | `/goals/:id` | Delete a goal |
| `GET` | `/goals/:goalId/progress` | Get calculated progress |
| `GET` | `/goals/:goalId/progress/history` | Get daily progress history |
| `POST` | `/goals/:goalId/progress/recalculate` | Recalculate progress from linked tasks |

See [the application documentation](docs/GROWBIT_APPLICATION_DOCUMENTATION.md) for data models, validation rules, example requests, progress calculation details, and response formats.

## Tests and quality checks

```bash
yarn test           # unit tests
yarn test:watch     # unit tests in watch mode
yarn test:e2e       # end-to-end tests
yarn test:cov       # coverage report
yarn lint           # lint and apply fixes
yarn format         # format source and test files
```

## CI/CD

GitHub Actions runs the CI workflow on every push and pull request targeting `master` or `main`. The workflow:

1. Checks out the repository on a clean Ubuntu runner.
2. Installs Node.js `26.4.0` and enables Yarn dependency caching.
3. Reproduces dependencies from `yarn.lock` with `yarn install --frozen-lockfile`.
4. Runs unit tests.
5. Runs endpoint-level end-to-end tests.
6. Builds the NestJS application.

The workflow is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). A failed step stops the job and prevents the CI check from passing.

Continuous deployment will be added after selecting a deployment target. Deployment credentials must be stored in GitHub Actions secrets, never in the repository.

## Production image

Build the production stage:

```bash
docker build --target production -t growbit .
```

Run it against a reachable PostgreSQL instance:

```bash
docker run --rm -p 3000:3000 \
  -e STAGE=prod \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5434 \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_DATABASE=task-management \
  -e JWT_SECRET=replace-with-a-long-random-secret \
  growbit
```

## License

This project is currently unlicensed and marked `UNLICENSED` in `package.json`.
