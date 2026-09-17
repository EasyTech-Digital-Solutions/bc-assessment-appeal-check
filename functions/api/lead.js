/**
 * POST /api/lead
 *
 * Cloudflare Pages Function. Validates a referral-form submission server-side
 * (never trust the client) and writes it to the LEADS KV namespace.
 *
 * Requires a KV binding named LEADS on the Pages project
 * (see wrangler.toml / README for setup).
 *
 * Rate limiting: a fixed-window counter per client IP, stored in the same
 * KV namespace (`ratelimit:<ip>`, TTL-expired automatically by KV). This is
 * a basic spam deterrent appropriate for a low-traffic lead form, not a
 * precise sliding-window limiter; that would need Durable Objects, which
 * is more infrastructure than this form's traffic justifies.
 */

const MAX_FIELD_LENGTH = 2000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

function isNonEmptyString(v, max) {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= (max || MAX_FIELD_LENGTH);
}

function isValidEmail(v) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function sanitize(v) {
  return typeof v === "string" ? v.trim().slice(0, MAX_FIELD_LENGTH) : "";
}

function jsonResponse(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ "content-type": "application/json; charset=utf-8" }, extraHeaders || {})
  });
}

async function isRateLimited(env, ip) {
  if (!ip) return false;
  const key = "ratelimit:" + ip;
  const raw = await env.LEADS.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= RATE_LIMIT_MAX) return true;
  await env.LEADS.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW_SECONDS });
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.LEADS) {
    return jsonResponse({ error: "Lead storage is not configured." }, 500);
  }

  const ip = request.headers.get("CF-Connecting-IP");
  if (await isRateLimited(env, ip)) {
    return jsonResponse(
      { error: "Too many submissions. Please try again later." },
      429,
      { "retry-after": String(RATE_LIMIT_WINDOW_SECONDS) }
    );
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  if (data && typeof data.company_website === "string" && data.company_website.trim() !== "") {
    // Honeypot tripped; pretend success, don't store.
    return jsonResponse({ ok: true });
  }

  const errors = [];
  if (!isNonEmptyString(data.name, 200)) errors.push("name");
  if (!isValidEmail(data.email)) errors.push("email");
  if (!isNonEmptyString(data.address, 500) && !isNonEmptyString(data.rollNumber, 100)) {
    errors.push("address or rollNumber");
  }
  if (data.consent !== true) errors.push("consent");

  if (errors.length > 0) {
    return jsonResponse({ error: "Missing or invalid fields: " + errors.join(", ") }, 400);
  }

  const lead = {
    name: sanitize(data.name),
    email: sanitize(data.email),
    phone: sanitize(data.phone),
    address: sanitize(data.address),
    rollNumber: sanitize(data.rollNumber),
    currentValue: sanitize(data.currentValue),
    previousValue: sanitize(data.previousValue),
    situation: sanitize(data.situation),
    consent: true,
    receivedAt: new Date().toISOString(),
    source: request.headers.get("referer") || ""
  };

  const key = "lead:" + Date.now() + ":" + crypto.randomUUID();

  try {
    await env.LEADS.put(key, JSON.stringify(lead));
  } catch (e) {
    return jsonResponse({ error: "Could not store submission." }, 500);
  }

  return jsonResponse({ ok: true });
}

export async function onRequestGet() {
  return jsonResponse({ error: "Method not allowed." }, 405);
}
