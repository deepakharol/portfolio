function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// GET /apps/todo/api/attachments/:id  — serve or download file from R2
export async function onRequestGet({ params, request, env }) {
  const attachment = await env.DB.prepare(
    'SELECT * FROM attachments WHERE id = ?'
  ).bind(params.id).first();

  if (!attachment) return json({ error: 'Not found' }, 404);

  const object = await env.ATTACHMENTS.get(attachment.r2_key);
  if (!object) return json({ error: 'File not found in storage' }, 404);

  const url = new URL(request.url);
  const download = url.searchParams.get('download') === '1';

  const headers = new Headers();
  headers.set('Content-Type', attachment.content_type || 'application/octet-stream');
  headers.set('Content-Length', String(attachment.size_bytes));
  headers.set('Cache-Control', 'private, max-age=3600');

  if (download) {
    headers.set('Content-Disposition', `attachment; filename="${attachment.filename}"`);
  } else {
    headers.set('Content-Disposition', `inline; filename="${attachment.filename}"`);
  }

  return new Response(object.body, { headers });
}

// DELETE /apps/todo/api/attachments/:id
export async function onRequestDelete({ params, env }) {
  const attachment = await env.DB.prepare(
    'SELECT * FROM attachments WHERE id = ?'
  ).bind(params.id).first();

  if (!attachment) return json({ error: 'Not found' }, 404);

  await env.ATTACHMENTS.delete(attachment.r2_key);
  await env.DB.prepare('DELETE FROM attachments WHERE id = ?').bind(params.id).run();

  return json({ success: true });
}
