function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function uuid() {
  return crypto.randomUUID();
}

// GET /apps/todo/api/tasks
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.completed = 1) as subtask_done,
      (SELECT COUNT(*) FROM attachments a WHERE a.task_id = t.id) as attachment_count
    FROM tasks t
    ORDER BY
      CASE priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 ELSE 5 END,
      due_date ASC,
      created_at DESC
  `).all();
  return json(results);
}

// POST /apps/todo/api/tasks
export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { title, description = '', priority = 'P1', due_date, status = 'pending' } = body;

  if (!title?.trim()) return json({ error: 'Title is required' }, 400);

  const id = uuid();
  const today = new Date().toISOString().split('T')[0];

  await env.DB.prepare(`
    INSERT INTO tasks (id, title, description, priority, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, title.trim(), description, priority, due_date || today, status).run();

  const task = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  return json(task, 201);
}
