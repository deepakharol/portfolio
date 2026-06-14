function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

// POST /apps/todo/api/attachments
export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const file = formData.get('file');
  const taskId = formData.get('task_id');

  if (!file || !taskId) return json({ error: 'file and task_id required' }, 400);
  if (file.size > MAX_SIZE) return json({ error: 'File exceeds 50MB limit' }, 413);

  const task = await env.DB.prepare('SELECT id FROM tasks WHERE id = ?').bind(taskId).first();
  if (!task) return json({ error: 'Task not found' }, 404);

  const id = crypto.randomUUID();
  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
  const r2Key = ext ? `${taskId}/${id}.${ext}` : `${taskId}/${id}`;

  await env.ATTACHMENTS.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' }
  });

  await env.DB.prepare(
    'INSERT INTO attachments (id, task_id, filename, r2_key, content_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, taskId, file.name, r2Key, file.type || 'application/octet-stream', file.size).run();

  const attachment = await env.DB.prepare(
    'SELECT id, filename, content_type, size_bytes, created_at FROM attachments WHERE id = ?'
  ).bind(id).first();

  return json(attachment, 201);
}
