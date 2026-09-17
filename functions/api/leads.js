/**
 * GET /api/leads
 *
 * Minimal token-protected endpoint to view captured leads until a real
 * partner/CRM integration exists. Not a public page; do not link to it
 * from the site nav.
 *
 * Auth: requires header  Authorization: Bearer <ADMIN_TOKEN>
 * ADMIN_TOKEN is set as a Pages secret (see README). If it isn't set,
 * this endpoint refuses all requests rather than defaulting open.
 */

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body, null, 2), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.LEADS) {
    return jsonResponse({ error: "Lead storage is not configured." }, 500);
  }
  if (!env.ADMIN_TOKEN) {
    return jsonResponse({ error: "Admin access is not configured." }, 503);
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (token !== env.ADMIN_TOKEN) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const list = await env.LEADS.list({ prefix: "lead:", limit: 200 });
  const leads = await Promise.all(
    list.keys.map(async (k) => {
      const value = await env.LEADS.get(k.name);
      return value ? JSON.parse(value) : null;
    })
  );

  return jsonResponse({
    count: leads.length,
    truncated: list.list_complete === false,
    leads: leads.filter(Boolean).sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))
  });
}
