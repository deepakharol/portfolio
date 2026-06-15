function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

const GUEST_TASK_LIMIT = 100;
const GUEST_TTL_HOURS = 1;

async function purgeExpiredDemoTasks(env) {
  const { results: oldAttachments } = await env.DB.prepare(`
    SELECT a.r2_key FROM attachments a
    JOIN tasks t ON a.task_id = t.id
    WHERE t.demo = 1 AND t.created_at < datetime('now', '-${GUEST_TTL_HOURS} hour')
  `).all();
  if (oldAttachments.length) {
    await Promise.all(oldAttachments.map(a => env.ATTACHMENTS.delete(a.r2_key)));
  }
  await env.DB.prepare(
    `DELETE FROM tasks WHERE demo = 1 AND created_at < datetime('now', '-${GUEST_TTL_HOURS} hour')`
  ).run();
}

// GET /apps/todo/api/tasks
export async function onRequestGet({ env, data }) {
  const isGuest = data.isGuest;
  if (isGuest) await purgeExpiredDemoTasks(env);

  const { results } = await env.DB.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.completed = 1) as subtask_done,
      (SELECT COUNT(*) FROM attachments a WHERE a.task_id = t.id) as attachment_count
    FROM tasks t
    WHERE t.demo = ?
    ORDER BY
      CASE priority WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 WHEN 'P3' THEN 4 ELSE 5 END,
      due_date ASC,
      created_at DESC
  `).bind(isGuest ? 1 : 0).all();

  return json(results);
}

// POST /apps/todo/api/tasks
export async function onRequestPost({ request, env, data }) {
  const isGuest = data.isGuest;
  const body = await request.json();
  const { title, description = '', priority = 'P1', due_date, status = 'pending', table_data = '[]' } = body;

  if (!title?.trim()) return json({ error: 'Title is required' }, 400);

  if (isGuest) {
    const count = await env.DB.prepare('SELECT COUNT(*) as n FROM tasks WHERE demo = 1').first();
    if (count.n >= GUEST_TASK_LIMIT) {
      return json({ error: `Demo sandbox is full (max ${GUEST_TASK_LIMIT} tasks). Old tasks are removed after ${GUEST_TTL_HOURS} hour.` }, 429);
    }
  }

  const id = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];

  await env.DB.prepare(`
    INSERT INTO tasks (id, title, description, priority, due_date, status, table_data, demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, title.trim(), description, priority, due_date || today, status, table_data, isGuest ? 1 : 0).run();

  const task = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  return json(task, 201);
}
