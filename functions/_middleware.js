// Hides repo-only files (docs, scripts, tests, config, notes) from the public site.
// Cloudflare Pages serves the whole repo root (pages_build_output_dir = "."),
// so without this, files like README.md and docs/ are publicly readable.
// _routes.json limits this function to the paths below, so normal pages never invoke it.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const notFound = await context.env.ASSETS.fetch(new URL("/404.html", url));
  return new Response(notFound.body, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
