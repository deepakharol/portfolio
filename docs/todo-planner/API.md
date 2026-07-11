# Todo Planner — API Reference

> Last updated: 2026-07-11
> Base URL: `https://deepakkharol.com/apps/todo/api`
> Future alias: `https://api.deepakkharol.com` (planned)

All routes except `POST /auth`, `POST /guest-auth`, and `POST /google-auth` require:
```
Authorization: Bearer <jwt>
```
A 401 means the token is missing, invalid, or expired.

---

## POST /google-auth

Sign in with Google. Verifies the Google ID token and, if the email matches the configured owner email, returns the same 30-day JWT as PIN login.

**Request**
```json
{ "credential": "<google-id-token>" }
```

**Response 200**
```json
{ "token": "<jwt>" }
```

**Response 401**
```json
{ "error": "Unauthorized Google account" }
```

---

## PATCH /tasks/reorder

Batch-update `sort_order` for multiple tasks (called after drag-reorder in the UI).

**Request**
```json
[{ "id": "uuid", "sort_order": 0 }, { "id": "uuid", "sort_order": 1 }]
```

**Response 200** `{ "success": true }`

---

## POST /guest-auth

Get a 1-hour guest JWT. No PIN required. Used for the demo/sandbox mode.

**Request** — no body needed

**Response 200**
```json
{ "token": "<jwt>", "role": "guest", "expiresIn": 3600 }
```

Guest JWT payload: `{ sub: "guest", role: "guest", iat: <unix>, exp: <unix+1h> }`

---

## POST /auth

Validate PIN and receive a JWT.

**Request**
```json
{ "pin": "<your-pin>" }
```

**Response 200**
```json
{ "token": "<jwt>" }
```

**Response 401**
```json
{ "error": "Invalid PIN" }
```

JWT payload: `{ sub: "owner", iat: <unix>, exp: <unix+30d> }`

---

## GET /tasks

List all tasks, sorted by priority (P0→P3) then due date then created date.

**Response 200**
```json
[
  {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "priority": "P0|P1|P2|P3",
    "due_date": "YYYY-MM-DD",
    "status": "pending|in_progress|done",
    "table_data": "[...]",
    "created_at": "datetime",
    "updated_at": "datetime",
    "subtask_count": 3,
    "subtask_done": 1,
    "attachment_count": 2
  }
]
```

---

## POST /tasks

Create a new task.

**Request**
```json
{
  "title": "string (required)",
  "description": "string (optional, default '')",
  "priority": "P0|P1|P2|P3 (optional, default 'P1')",
  "due_date": "YYYY-MM-DD (optional, default today)",
  "status": "pending|in_progress|done (optional, default 'pending')",
  "table_data": "JSON string (optional, default '[]')"
}
```

**Response 201** — full task object (same shape as GET /tasks item, without the count fields)

**Response 400**
```json
{ "error": "Title is required" }
```

---

## GET /tasks/:id

Get a single task with full subtask and attachment data.

**Response 200**
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "priority": "P1",
  "due_date": "YYYY-MM-DD",
  "status": "pending",
  "table_data": "[{\"id\":\"...\",\"title\":\"\",\"columns\":[\"Col 1\"],\"rows\":[[\"value\"]]}]",
  "created_at": "datetime",
  "updated_at": "datetime",
  "subtasks": [
    { "id": "uuid", "task_id": "uuid", "content": "string", "completed": 0, "order_index": 0 }
  ],
  "attachments": [
    { "id": "uuid", "filename": "string", "content_type": "image/jpeg", "size_bytes": 12345, "created_at": "datetime" }
  ]
}
```

Note: `r2_key` is intentionally excluded from attachments in the response.

**Response 404** `{ "error": "Not found" }`

---

## PUT /tasks/:id

Update one or more fields on a task. Send only the fields you want to change.

**Request** (all fields optional)
```json
{
  "title": "string",
  "description": "string",
  "priority": "P0|P1|P2|P3",
  "due_date": "YYYY-MM-DD",
  "status": "pending|in_progress|done",
  "table_data": "JSON string"
}
```

`updated_at` is set automatically to `datetime('now')`.

**Response 200** — updated task object (flat fields, no subtasks/attachments)

**Response 400** `{ "error": "Nothing to update" }` (if body has no recognized fields)

**Response 404** `{ "error": "Not found" }`

---

## DELETE /tasks/:id

Delete a task and all its data.

**Sequence:**
1. Fetch all `r2_key` values for this task's attachments
2. Delete each file from R2
3. `DELETE FROM tasks WHERE id = ?` (cascades subtasks + attachments via FK)

**Response 200** `{ "success": true }`

**Response 404** `{ "error": "Not found" }`

---

## POST /tasks/:id/subtasks

Add a subtask.

**Request**
```json
{ "content": "string (required)" }
```

**Response 201**
```json
{ "id": "uuid", "task_id": "uuid", "content": "string", "completed": 0, "order_index": 0 }
```

---

## PUT /tasks/:id/subtasks

Batch update all subtasks (reorder, edit text, toggle complete).

**Request** — full array of all subtasks in desired order
```json
[
  { "id": "uuid", "content": "string", "completed": 0, "order_index": 0 },
  { "id": "uuid", "content": "string", "completed": 1, "order_index": 1 }
]
```

**Response 200** `{ "success": true }`

---

## DELETE /tasks/:id/subtasks

Delete a single subtask by id.

**Request**
```json
{ "id": "uuid" }
```

**Response 200** `{ "success": true }`

---

## POST /attachments

Upload a file to R2 and record metadata in D1.

**Request** — `multipart/form-data`
```
file: <File>          (required, max 50MB)
task_id: <uuid>       (required)
```

R2 key format: `tasks/<task_id>/<uuid>/<filename>`

**Response 201**
```json
{
  "id": "uuid",
  "task_id": "uuid",
  "filename": "photo.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 123456,
  "created_at": "datetime"
}
```

**Response 400** `{ "error": "File and task_id are required" }`

**Response 413** `{ "error": "File too large (max 50MB)" }`

---

## GET /attachments/:id

Stream file contents from R2. File is served inline by default; add `?download=1` to force browser download.

**Response 200** — raw file bytes with:
- `Content-Type`: original content type
- `Content-Disposition`: `inline; filename="..."` or `attachment; filename="..."`
- `Cache-Control`: `private, max-age=3600`

**Response 404** `{ "error": "Not found" }` (DB record missing) or `{ "error": "File not found in storage" }` (R2 missing)

---

## DELETE /attachments/:id

Delete an attachment from both R2 and D1.

**Response 200** `{ "success": true }`

**Response 404** `{ "error": "Not found" }`

---

## Error Codes Summary

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Missing or invalid JWT |
| 404 | Resource not found |
| 413 | File too large |
| 500 | Unhandled server error |
