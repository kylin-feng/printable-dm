/* Lightweight privacy-friendly analytics beacon — counts page views, referrer
   sources, unique visitors, languages and download clicks. No cookies, no PII. */
(function () {
  var NS = "pdmlab-7k2m9x";
  var ENDPOINT = "https://abacus.jasoncameron.dev/hit/" + NS + "/";

  function send(key) {
    try {
      var url = ENDPOINT + encodeURIComponent(key) + "?t=" + Date.now() + Math.random().toString(36).slice(2, 6);
      fetch(url, { mode: "no-cors", keepalive: true, cache: "no-store" }).catch(function () {});
    } catch (e) { /* stats must never break the page */ }
  }

  /* normalize path: strip trailing "index.html", collapse to page key */
  function pageKey() {
    var p = location.pathname.replace(/\/index\.html?$/, "/").replace(/^.*\/printable-dm/, "").replace(/^\/+/, "");
    return (p ? p.replace(/\/+$/, "") : "home").replace(/[^A-Za-z0-9_.-]/g, "-");
  }

  /* classify referrer into a small fixed set of source buckets */
  function refBucket() {
    var ref = document.referrer || "";
    if (!ref) return "direct";
    try {
      var h = new URL(ref).hostname.replace(/^www\./, "");
      if (/google\./.test(h)) return "google";
      if (/bing\.com/.test(h)) return "bing";
      if (/duckduckgo\.com/.test(h)) return "duckduckgo";
      if (/reddit\.com/.test(h)) return "reddit";
      if (/pinterest\./.test(h)) return "pinterest";
      if (/facebook\.com|instagram\.com/.test(h)) return "facebook";
      if (/twitter\.com|x\.com/.test(h)) return "x";
      if (/youtube\.com/.test(h)) return "youtube";
      if (/kylin-feng\.github\.io/.test(h)) return "internal";
      return "other-" + h.replace(/[^a-z0-9.-]/g, "").slice(0, 28);
    } catch (e) { return "other"; }
  }

  function langKey() {
    var l = (navigator.language || "unknown").toLowerCase();
    return l === "unknown" ? l : l.replace(/[^a-z-]/g, "");
  }

  send("pv." + pageKey());
  send("src." + refBucket());
  send("lng." + langKey());

  try {
    if (!localStorage.getItem("pdm-uv")) {
      localStorage.setItem("pdm-uv", "1");
      send("uv.all");
    }
  } catch (e) { /* private mode */ }

  /* track download + outbound clicks */
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[data-dl],a[data-ext]");
    if (!a) return;
    if (a.dataset.dl) send("dl." + a.dataset.dl.replace(/[^A-Za-z0-9_.-]/g, "-"));
    if (a.dataset.ext) send("ext." + a.dataset.ext.replace(/[^A-Za-z0-9_.-]/g, "-"));
  }, true);
})();
