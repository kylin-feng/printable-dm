/* traffic-snapshot.mjs — fetch all analytics counters and write/compare a daily snapshot.
   Run: node tools/traffic-snapshot.mjs            (writes snapshot + prints day-over-day report)
        node tools/traffic-snapshot.mjs --report   (report only, no snapshot write) */
import https from "node:https";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOG = join(ROOT, "tools", "traffic-log.json");
const NS = "pdmlab-7k2m9x";

const PAGES = ["home", "initiative-tracker", "dm-screen-cheat-sheet", "combat-tracker", "condition-cards", "session-notes-template", "guides-how-to-track-initiative", "guides-what-goes-on-a-dm-screen", "about", "contact", "privacy"];
const SRCS = ["google", "bing", "duckduckgo", "reddit", "pinterest", "facebook", "x", "youtube", "internal", "direct"];
const LANGS = ["en-us", "en-gb", "en-ca", "en-au", "de-de", "fr-fr", "es-es", "pt-br", "zh-cn", "ja"];
const DLS = ["initiative-tracker", "dm-screen-cheat-sheet", "combat-tracker", "condition-cards", "session-notes"];
const KEYS = ["uv.all",
  ...PAGES.map(p => "pv." + p),
  ...SRCS.map(s => "src." + s),
  ...LANGS.map(l => "lng." + l),
  ...DLS.map(d => "dl." + d)];

const get = k => new Promise(res => {
  const req = https.get(`https://abacus.jasoncameron.dev/get/${NS}/${k}`, r => {
    let d = "";
    r.on("data", c => d += c);
    r.on("end", () => { try { res(JSON.parse(d).value || 0); } catch { res(0); } });
  });
  req.on("error", () => res(0));
  req.setTimeout(15000, () => { req.destroy(); res(0); });
});

const reportOnly = process.argv.includes("--report");

const prev = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : { date: "-", counters: {} };
const counters = {};
await Promise.all(KEYS.map(async k => { counters[k] = await get(k); }));

const delta = k => counters[k] - (prev.counters[k] ?? 0);
const top = (prefix, n = 5) => KEYS.filter(k => k.startsWith(prefix))
  .map(k => [k.slice(prefix.length), delta(k)]).filter(([, v]) => v > 0)
  .sort((a, b) => b[1] - a[1]).slice(0, n);

const pvTotal = PAGES.reduce((a, p) => a + delta("pv." + p), 0);
const dlTotal = DLS.reduce((a, d) => a + delta("dl." + d), 0);

console.log(`=== Printable DM traffic report (${new Date().toISOString().slice(0, 10)}) ===`);
console.log(`vs baseline ${prev.date}`);
console.log(`Page views +${pvTotal} | New downloads +${dlTotal} | Sources: ${top("src.").map(([s, v]) => s + "+" + v).join(", ") || "none"}`);
console.log(`Top pages: ${top("pv.").map(([p, v]) => p + "+" + v).join(", ") || "none"}`);
console.log(`Languages: ${top("lng.").map(([l, v]) => l + "+" + v).join(", ") || "none"}`);
console.log(`Cumulative totals: PV ${PAGES.reduce((a, p) => a + counters["pv." + p], 0)} | DL ${DLS.reduce((a, d) => a + counters["dl." + d], 0)} | UV ${counters["uv.all"]}`);

if (!reportOnly) {
  fs.writeFileSync(LOG, JSON.stringify({ date: new Date().toISOString().slice(0, 10), counters }, null, 2));
  console.log("snapshot written:", LOG);
}
export { pvTotal, dlTotal };
