function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// PATCH /apps/todo/api/tasks/reorder
// Body: [{ id: "uuid", sort_order: 0 }, ...]
export async function onRequestPatch({ request, env, data }) {
  const items = await request.json();
  if (!Array.isArray(items) || !items.length) return json({ error: 'Expected non-empty array' }, 400);

  const stmts = items.map(item =>
    env.DB.prepare(
      `UPDATE tasks SET sort_order = ? WHERE id = ? AND demo = ?`
    ).bind(item.sort_order, item.id, data.isGuest ? 1 : 0)
  );

  await env.DB.batch(stmts);
  return json({ success: true });
}
