# Growbit

**Small progress every day**

## 1. Purpose

Growbit is a personal goal and task management API. A user can create goals, attach optional tasks to them, track partial task completion, and view weighted goal progress and daily progress history.

The API is built with NestJS, TypeORM, PostgreSQL, JWT authentication, and Swagger/OpenAPI.

## 2. Main Features

- User signup, login, forgot-password, and reset-password flows.
- JWT-protected task and goal APIs.
- Goals with dates, priorities, statuses, target minutes, and calculated progress.
- Optional task-to-goal relationship: a task can exist without a goal.
- Task status, priority, estimated/actual time, due date, completion date, and partial progress.
- Weighted goal progress based on task estimated minutes.
- Automatic recalculation after linked-task changes.
- Goal progress logs and chart-friendly daily history.
- Interactive Swagger documentation at `/api-docs`.

## 3. Architecture

```text
Client
  -> NestJS Controllers
    -> Services (business rules)
      -> TypeORM Repositories
        -> PostgreSQL
```

Modules:

- `AuthModule`: identity, JWT, password reset.
- `TasksModule`: task lifecycle and task-to-goal linkage.
- `GoalsModule`: goals, progress calculation, and progress history.

All protected endpoints use the JWT Bearer token from the `Authorization` header:

```http
Authorization: Bearer <accessToken>
```

## 4. Data Model

### User

| Field | Description |
| --- | --- |
| `id` | UUID primary key. |
| `username` | Unique login name. |
| `email` | Unique email used for password reset. |
| `password` | Bcrypt-hashed password. |
| `password_reset_token` | SHA-256 hash of the temporary reset token. |
| `password_reset_expires_at` | Reset-token expiry timestamp. |

### Goal

| Field | Description |
| --- | --- |
| `id` | UUID primary key. |
| `title`, `description` | Goal details. |
| `start_date`, `end_date` | Planned duration. |
| `target_minutes` | Target work time. |
| `progress_percentage` | Current calculated weighted progress. |
| `status` | `not_started`, `in_progress`, `completed`, `failed`, or `paused`. |
| `priority` | `low`, `medium`, `high`, or `critical`. |
| `created_at`, `updated_at` | Audit timestamps. |

### Task

| Field | Description |
| --- | --- |
| `id` | UUID primary key. |
| `title`, `description` | Task details. |
| `status` | `OPEN`, `IN_PROGRESS`, `DONE`, or `SKIPPED`. |
| `goal` | Optional many-to-one relationship to a goal. |
| `start_datetime`, `due_datetime` | Task schedule. |
| `estimated_minutes` | Estimated work; defaults to 30 minutes when omitted. |
| `actual_minutes` | Recorded actual work time. |
| `progress_percentage` | Partial completion from 0 to 100. |
| `priority` | `low`, `medium`, `high`, or `critical`. |
| `completed_at` | Set when the task becomes `DONE`. |

### Goal Progress Log

Each recalculation stores a snapshot in `goal_progress_logs`.

| Field | Description |
| --- | --- |
| `id` | Incrementing bigint primary key. |
| `goal_id`, `user_id` | UUID foreign-key relationships. |
| `progress_percentage` | Weighted goal progress at the time of logging. |
| `total_tasks`, `completed_tasks` | Task counters. |
| `total_estimated_minutes` | Sum of all task estimates. |
| `completed_estimated_minutes` | Weighted completed minutes; supports decimals. |
| `logged_at` | Snapshot timestamp. |

## 5. Authentication Business Logic

### Signup

1. Validate username, email, and password.
2. Hash the password with bcrypt.
3. Save the user.
4. Return a conflict response if the username or email already exists.

### Login

1. Find the user by username.
2. Compare the provided password with the bcrypt hash.
3. Create a JWT containing the username.
4. Return `{ "accessToken": "..." }`.

### Forgot Password

1. Find the user by email.
2. Always return the same generic message, whether or not the user exists.
3. For an existing user, generate a random 32-byte reset token.
4. Store only its SHA-256 hash and a 15-minute expiry time.
5. Return the raw reset token in the API response for the current development flow. A production application should send it by email instead.

### Reset Password

1. Hash the supplied reset token.
2. Find a user with the matching token hash.
3. Reject missing or expired tokens.
4. Hash and save the new password.
5. Clear both reset-token fields.

## 6. Task Business Logic

### Creating a Task

1. A task may be created with or without `goal_id`.
2. When `goal_id` is supplied, Growbit confirms that the goal belongs to the logged-in user.
3. Missing `estimated_minutes` defaults to 30.
4. Initial status is derived from progress:

| Progress | Initial status |
| --- | --- |
| `0` | `OPEN` |
| `1` to `99.99` | `IN_PROGRESS` |
| `100` | `DONE` and `completed_at` is set |

5. Creating a linked task automatically recalculates its goal.

### Updating Status

- `DONE`: sets task progress to 100 and sets `completed_at`.
- `OPEN` or `SKIPPED`: sets task progress to 0 and clears `completed_at`.
- `IN_PROGRESS`: clears `completed_at`; a prior 100% value is reset to 0.
- A linked goal is recalculated after every status change.

### Updating Partial Progress

`PATCH /tasks/:taskId/progress` accepts a `progress_percentage` from 0 to 100.

| Progress | Result |
| --- | --- |
| `0` | Task becomes `OPEN`; completion timestamp is cleared. |
| `1` to `99.99` | Task becomes `IN_PROGRESS`; completion timestamp is cleared. |
| `100` | Task becomes `DONE`; completion timestamp is set. |

A linked goal is recalculated after the task is saved.

### Completing and Deleting

- `PATCH /tasks/:taskId/complete` sets `DONE`, progress 100, and `completed_at`.
- If the task belongs to a goal, the response includes a compact goal-progress result.
- Deleting a linked task recalculates the goal after the task is removed.

## 7. Goal Progress Business Logic

### Weighted Calculation

Goal progress is calculated from estimated time, not simply from the number of completed tasks.

```text
completedWeightedMinutes = sum(
  task.estimated_minutes * taskProgressPercentage / 100
)

goalProgressPercentage =
  completedWeightedMinutes / totalEstimatedMinutes * 100
```

Task contribution rules:

| Task status | Contribution |
| --- | --- |
| `DONE` | 100% of its estimated minutes. |
| `IN_PROGRESS` | Its `progress_percentage`, clamped between 0 and 100. |
| `OPEN` | 0%. |
| `SKIPPED` | 0%. |

Additional safeguards:

- A missing estimate uses 30 minutes during calculation, including legacy records.
- Progress is capped between 0 and 100.
- No tasks produces 0% progress.
- If all existing tasks are `DONE`, progress is 100%, including tasks with legacy missing estimates.
- `remainingEstimatedMinutes = totalEstimatedMinutes - completedEstimatedMinutes`.

### Goal Status Rules

During recalculation:

| Condition | Goal status |
| --- | --- |
| Current date is after `end_date` and progress is below 100 | `failed` |
| Progress is 0 | `not_started` |
| Progress is 100 | `completed` |
| Otherwise | `in_progress` |

The progress summary also returns `remainingDays` and `isOverdue`.

### Automatic Recalculation

Goal recalculation is called after a linked task is:

- Created
- Updated through status
- Updated through partial progress
- Completed
- Deleted
- Skipped through the status endpoint

`POST /goals/:goalId/progress/recalculate` remains available as a manual recovery endpoint.

### Progress Logs and History

Every successful recalculation saves a progress-log snapshot. The history API sorts logs by time and returns the latest snapshot for each UTC calendar day, which avoids duplicate points in a line chart.

```json
[
  { "date": "2026-07-01", "progressPercentage": 10 },
  { "date": "2026-07-02", "progressPercentage": 25 }
]
```

## 8. API Reference

Base URL: `http://localhost:3000`

### Authentication

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | No | Create an account. |
| `POST` | `/auth/login` | No | Get a JWT access token. |
| `POST` | `/auth/forgot-password` | No | Generate a reset token for an email. |
| `POST` | `/auth/reset-password` | No | Set a new password from a valid reset token. |

### Tasks

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/tasks?status=&search=` | List the current user's tasks. |
| `GET` | `/tasks/:id` | Get one task. |
| `POST` | `/tasks` | Create a task. |
| `PATCH` | `/tasks/:id/status` | Update status; use `OPEN`, `IN_PROGRESS`, `DONE`, or `SKIPPED`. |
| `PATCH` | `/tasks/:taskId/complete` | Complete a task and return related goal progress. |
| `PATCH` | `/tasks/:taskId/progress` | Set partial task progress. |
| `DELETE` | `/tasks/:id` | Delete a task. |

### Goals

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/goals` | Create a goal. |
| `GET` | `/goals` | List the current user's goals. |
| `GET` | `/goals/:id` | Get one goal. |
| `PATCH` | `/goals/:id` | Partially update a goal. |
| `DELETE` | `/goals/:id` | Delete a goal. |
| `GET` | `/goals/:goalId/progress` | Get the current progress summary. |
| `POST` | `/goals/:goalId/progress/recalculate` | Recalculate, update, and log progress. |
| `GET` | `/goals/:goalId/progress/history` | Get chart-friendly daily progress points. |

### Important Request Examples

Create a linked task:

```json
{
  "title": "Build authentication module",
  "description": "Implement signup and login",
  "goal_id": "goal-uuid",
  "estimated_minutes": 600,
  "progress_percentage": 40,
  "priority": "high"
}
```

Update partial progress:

```json
{
  "progress_percentage": 55
}
```

Complete a task response:

```json
{
  "message": "Task completed successfully",
  "goalProgress": {
    "progressPercentage": 55,
    "completedTasks": 4,
    "totalTasks": 8
  }
}
```

## 9. Validation and Error Handling

- Global validation transforms input values, strips fields that are not in a DTO, and rejects invalid values.
- Progress values must be between 0 and 100.
- Estimated and actual minutes cannot be negative.
- A user cannot access another user's tasks or goals.
- Missing owned resources return `404 Not Found`.
- Invalid task status returns `400 Bad Request`.
- Duplicate username or email returns `409 Conflict`.
- Unexpected persistence failures return `500 Internal Server Error`.

## 10. Running the Application

Required environment values:

```text
STAGE=dev
DB_HOST=localhost
DB_PORT=5434
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=task-management
JWT_SECRET=replace-with-a-secure-secret
```

Local development:

```bash
yarn install
yarn start:dev
```

Useful URLs:

| URL | Purpose |
| --- | --- |
| `http://localhost:3000/api-docs` | Swagger UI. |
| `http://localhost:3000/api-docs-json` | OpenAPI JSON document. |
| `http://localhost:5050` | pgAdmin when running Docker Compose. |

Docker Compose starts the API, PostgreSQL, and pgAdmin:

```bash
docker compose up --build
```

## 11. Testing

```bash
yarn test --runInBand
yarn test:e2e --runInBand
yarn build
```

The unit tests cover controller-to-service contracts and the key goal-progress and task lifecycle business rules. The HTTP endpoint suite covers all authentication, task, and goal routes with mocked services.
