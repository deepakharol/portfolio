function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Confirm the parent task exists AND belongs to the caller's scope (owner vs demo).
// Without this, a guest could mutate an owner task's subtasks by guessing its id.
async function ownsTask(env, taskId, isGuest) {
  const row = await env.DB.prepare(
    'SELECT id FROM tasks WHERE id = ? AND demo = ?'
  ).bind(taskId, isGuest ? 1 : 0).first();
  return !!row;
}

// POST /apps/todo/api/tasks/:id/subtasks — add a single subtask
export async function onRequestPost({ params, request, env, data }) {
  if (!(await ownsTask(env, params.id, data.isGuest))) return json({ error: 'Not found' }, 404);
  const { content } = await request.json();
  if (!content?.trim()) return json({ error: 'Content required' }, 400);

  const { results: existing } = await env.DB.prepare(
    'SELECT MAX(order_index) as max_idx FROM subtasks WHERE task_id = ?'
  ).bind(params.id).all();

  const order_index = (existing[0]?.max_idx ?? -1) + 1;
  const id = crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO subtasks (id, task_id, content, order_index) VALUES (?, ?, ?, ?)'
  ).bind(id, params.id, content.trim(), order_index).run();

  const subtask = await env.DB.prepare('SELECT * FROM subtasks WHERE id = ?').bind(id).first();
  return json(subtask, 201);
}

// PUT /apps/todo/api/tasks/:id/subtasks — batch upsert (reorder, toggle, edit, new from split)
// Accepts new subtask IDs that don't exist yet (created client-side during Enter-split).
export async function onRequestPut({ params, request, env, data }) {
  if (!(await ownsTask(env, params.id, data.isGuest))) return json({ error: 'Not found' }, 404);
  const subtasks = await request.json(); // array of { id, content, completed, order_index }
  if (!Array.isArray(subtasks)) return json({ error: 'Expected array' }, 400);

  // Use INSERT OR REPLACE so new subtask IDs from Enter-split are created, existing ones updated.
  const stmts = subtasks.map(s =>
    env.DB.prepare(
      'INSERT OR REPLACE INTO subtasks (id, task_id, content, completed, order_index) VALUES (?, ?, ?, ?, ?)'
    ).bind(s.id, params.id, s.content, s.completed ? 1 : 0, s.order_index)
  );

  if (stmts.length) await env.DB.batch(stmts);

  const { results } = await env.DB.prepare(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index'
  ).bind(params.id).all();

  return json(results);
}

// DELETE /apps/todo/api/tasks/:id/subtasks — delete a subtask by id in body
export async function onRequestDelete({ params, request, env, data }) {
  if (!(await ownsTask(env, params.id, data.isGuest))) return json({ error: 'Not found' }, 404);
  const { id } = await request.json();
  if (!id) return json({ error: 'Subtask id required' }, 400);

  await env.DB.prepare(
    'DELETE FROM subtasks WHERE id = ? AND task_id = ?'
  ).bind(id, params.id).run();

  return json({ success: true });
}
