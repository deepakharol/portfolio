function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// POST /apps/todo/api/tasks/:id/subtasks — add a single subtask
export async function onRequestPost({ params, request, env }) {
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

// PUT /apps/todo/api/tasks/:id/subtasks — batch update (reorder, toggle, edit)
export async function onRequestPut({ params, request, env }) {
  const subtasks = await request.json(); // array of { id, content, completed, order_index }
  if (!Array.isArray(subtasks)) return json({ error: 'Expected array' }, 400);

  const stmts = subtasks.map(s =>
    env.DB.prepare(
      'UPDATE subtasks SET content = ?, completed = ?, order_index = ? WHERE id = ? AND task_id = ?'
    ).bind(s.content, s.completed ? 1 : 0, s.order_index, s.id, params.id)
  );

  if (stmts.length) await env.DB.batch(stmts);

  const { results } = await env.DB.prepare(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index'
  ).bind(params.id).all();

  return json(results);
}

// DELETE /apps/todo/api/tasks/:id/subtasks — delete a subtask by id in body
export async function onRequestDelete({ params, request, env }) {
  const { id } = await request.json();
  if (!id) return json({ error: 'Subtask id required' }, 400);

  await env.DB.prepare(
    'DELETE FROM subtasks WHERE id = ? AND task_id = ?'
  ).bind(id, params.id).run();

  return json({ success: true });
}
