function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-cache'
    }
  });
}

function demoFilter(isGuest) {
  return isGuest ? 'AND demo = 1' : 'AND demo = 0';
}

// GET /apps/todo/api/tasks/:id
export async function onRequestGet({ params, env, data }) {
  const task = await env.DB.prepare(
    `SELECT * FROM tasks WHERE id = ? ${demoFilter(data.isGuest)}`
  ).bind(params.id).first();
  if (!task) return json({ error: 'Not found' }, 404);

  const { results: subtasks } = await env.DB.prepare(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index, id'
  ).bind(params.id).all();

  const { results: attachments } = await env.DB.prepare(
    'SELECT id, filename, content_type, size_bytes, created_at FROM attachments WHERE task_id = ? ORDER BY created_at'
  ).bind(params.id).all();

  return json({ ...task, subtasks, attachments });
}

// PUT /apps/todo/api/tasks/:id
export async function onRequestPut({ params, request, env, data }) {
  const task = await env.DB.prepare(
    `SELECT id FROM tasks WHERE id = ? ${demoFilter(data.isGuest)}`
  ).bind(params.id).first();
  if (!task) return json({ error: 'Not found' }, 404);

  const body = await request.json();
  const fields = ['title', 'description', 'priority', 'due_date', 'status', 'table_data', 'category', 'sort_order'];
  const updates = [];
  const values = [];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (!updates.length) return json({ error: 'Nothing to update' }, 400);

  updates.push(`updated_at = datetime('now')`);
  values.push(params.id);

  await env.DB.prepare(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const updated = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(params.id).first();
  return json(updated);
}

// DELETE /apps/todo/api/tasks/:id
export async function onRequestDelete({ params, env, data }) {
  const task = await env.DB.prepare(
    `SELECT id FROM tasks WHERE id = ? ${demoFilter(data.isGuest)}`
  ).bind(params.id).first();
  if (!task) return json({ error: 'Not found' }, 404);

  const { results: attachments } = await env.DB.prepare(
    'SELECT r2_key FROM attachments WHERE task_id = ?'
  ).bind(params.id).all();

  await Promise.all(attachments.map(a => env.ATTACHMENTS.delete(a.r2_key)));
  await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(params.id).run();

  return json({ success: true });
}
