// Checks every filled affiliate URL in data/affiliates.json.
// Writes link_report.txt and exits 1 if any link fails.
const fs = require("fs");

const data = JSON.parse(fs.readFileSync("data/affiliates.json", "utf8"));
const entries = Object.entries(data.links).filter(([, l]) => l.url);

async function check([key, link]) {
  try {
    const res = await fetch(link.url, { method: "GET", redirect: "follow" });
    return { key, url: link.url, ok: res.status < 400, status: res.status };
  } catch (err) {
    return { key, url: link.url, ok: false, status: String(err.message) };
  }
}

(async () => {
  if (entries.length === 0) {
    console.log("No affiliate URLs filled in yet.");
    return;
  }
  const results = await Promise.all(entries.map(check));
  const failed = results.filter((r) => !r.ok);
  const lines = results.map((r) => `${r.ok ? "OK  " : "FAIL"} ${r.key} ${r.status} ${r.url}`);
  fs.writeFileSync("link_report.txt", lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  if (failed.length) process.exit(1);
})();
