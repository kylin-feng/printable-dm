/* build.mjs — renders all pages of Printable DM into static HTML.
   Run: node tools/build.mjs  (from repo root) */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const SITE = "https://kylin-feng.github.io/printable-dm";
const BUILT = "2026-11-18";
const INDEXNOW_KEY = "7f3a9c21e8b4d6502a9f1c33ab54e7d8";
const YEAR = "2026";

/* ---------------- shared fragments ---------------- */

const NAV = [
  ["/initiative-tracker/", "Initiative Tracker"],
  ["/dm-screen-cheat-sheet/", "DM Screen"],
  ["/combat-tracker/", "Combat Tracker"],
  ["/condition-cards/", "Condition Cards"],
  ["/session-notes-template/", "Session Notes"],
  ["/guides/how-to-track-initiative/", "Guides"],
];

const PRODUCTS = [
  { slug: "initiative-tracker", icon: "\u2694\uFE0F", name: "Initiative Tracker", desc: "A 22-slot roster with AC, HP and notes columns plus a round counter strip. The one sheet every DM prints ten of.", meta: ["2 pages", "US Letter + A4", "PDF"] },
  { slug: "dm-screen-cheat-sheet", icon: "\uD83D\uDDC4\uFE0F", name: "DM Screen Cheat Sheet", desc: "Four dense reference inserts: action economy, all 15 conditions, common DCs and the dying rules.", meta: ["5 pages", "US Letter + A4", "PDF"] },
  { slug: "combat-tracker", icon: "\uD83D\uDCE1", name: "Combat Tracker", desc: "Eight oversized combatant blocks with HP pips and a concentration tracker for long boss fights.", meta: ["2 pages", "US Letter + A4", "PDF"] },
  { slug: "condition-cards", icon: "\uD83C\uDCCF", name: "Condition Cards", desc: "Fifteen die-cut cards, one per condition. Cut them out, clip them to the DM screen, never argue about poisoned again.", meta: ["2 pages", "15 cards", "PDF"] },
  { slug: "session-notes-template", icon: "\uD83D\uDCD3", name: "Session Notes Template", desc: "A two-page recap sheet: party status, NPCs met, loot handed out and the hooks you planted for next time.", meta: ["2 pages", "US Letter + A4", "PDF"] },
];

function header(base) {
  const nav = NAV.map(([href, label]) =>
    `<a href="${base}${href.slice(1)}">${label}</a>`).join("\n          ");
  return `<header class="site-header">
      <div class="wrap">
        <a class="brand" href="${base}index.html">
          <img class="d20" src="${base}assets/favicon.svg" alt="" aria-hidden="true">
          Printable&nbsp;DM
        </a>
        <nav class="site-nav" aria-label="Main">
          ${nav}
        </nav>
      </div>
    </header>`;
}

function footer(base) {
  return `<footer class="site-footer">
      <div class="wrap cols">
        <div>
          <h4>Free Tools</h4>
          <ul>
            ${PRODUCTS.map(p => `<li><a href="${base}${p.slug}/">${p.name}</a></li>`).join("\n            ")}
          </ul>
        </div>
        <div>
          <h4>Guides</h4>
          <ul>
            <li><a href="${base}guides/how-to-track-initiative/">How to Track Initiative in D&amp;D 5e</a></li>
            <li><a href="${base}guides/what-goes-on-a-dm-screen/">What Goes on a DM Screen</a></li>
            <li><a href="${base}guides/how-to-run-combat/">How to Run Combat (Cheat Sheet)</a></li>
            <li><a href="${base}guides/conditions-explained/">D&amp;D Conditions Explained</a></li>
            <li><a href="${base}guides/session-zero-checklist/">Session Zero Checklist</a></li>
            <li><a href="${base}guides/metal-vs-resin-dice/">Metal vs Resin Dice</a></li>
            <li><a href="${base}guides/dm-prep-checklist/">DM Prep in 30 Minutes</a></li>
            <li><a href="${base}guides/how-to-run-a-one-shot/">How to Run a One-Shot</a></li>
            <li><a href="${base}guides/what-dice-do-you-need/">What Dice Do You Need?</a></li>
            <li><a href="${base}guides/milestone-vs-xp-leveling/">Milestone vs XP Leveling</a></li>
          </ul>
        </div>
        <div>
          <h4>Site</h4>
          <ul>
            <li><a href="${base}about/">About</a></li>
            <li><a href="${base}contact/">Contact</a></li>
            <li><a href="${base}privacy/">Privacy</a></li>
          </ul>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><a href="https://kylin-feng.github.io/dice-goblin-shop/" target="_blank" rel="noopener">Dice Goblin &mdash; metal &amp; resin dice sets &#8599;</a></li>
            <li><a href="https://kylin-feng.github.io/dice-goblin-shop/products/metal-dice-bundle/" target="_blank" rel="noopener">Metal dice + tray bundle &#8599;</a></li>
          </ul>
        </div>
      </div>
      <div class="wrap fine">
        <p>&copy; ${YEAR} Printable DM. Our PDFs are free for personal use at your table. This is unofficial fan content and is not approved by, endorsed by, or affiliated with Wizards of the Coast. Dungeons &amp; Dragons and D&amp;D are trademarks of Wizards of the Coast LLC.</p>
      </div>
    </footer>`;
}

function faqSchema(faq) {
  if (!faq || !faq.length) return "";
  const items = faq.map(([q, a]) => `{"@type":"Question","name":${JSON.stringify(q)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(a)}}}`).join(",");
  return `<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${items}]}</script>`;
}

function breadcrumbSchema(crumbs) {
  const items = crumbs.map(([url, name], i) => {
    const item = url ? `,"item":"${SITE}${url === "/" ? "/" : url}"` : "";
    return `{"@type":"ListItem","position":${i + 1},"name":${JSON.stringify(name)}${item}}`;
  }).join(",");
  return `<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[${items}]}</script>`;
}

function layout({ base = "", path = "/", title, desc, h1Block, bodyHTML, crumbs = [], faq = [], noindex = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  ${noindex ? '<meta name="robots" content="noindex,nofollow">' : `<link rel="canonical" href="${SITE}${path}">`}
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${SITE}${path}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" type="image/svg+xml" href="${base}assets/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${base}assets/css/style.css">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Printable DM","url":"${SITE}/"}</script>
  ${breadcrumbSchema(crumbs)}
  ${faqSchema(faq)}
</head>
<body>
  ${header(base)}
  ${h1Block}
  <main>
    ${bodyHTML}
  </main>
  ${footer(base)}
  <script src="${base}assets/js/abacus.js" defer></script>
</body>
</html>`;
}

function pageHead(crumbTrail, h1, lead) {
  const crumbs = crumbTrail.map(([href, label]) =>
    href ? `<a href="${href}">${label}</a>` : label).join(" &rsaquo; ");
  return `<div class="page-head">
      <div class="wrap">
        <div class="crumbs">${crumbs}</div>
        <h1>${h1}</h1>
        <p>${lead}</p>
      </div>
    </div>`;
}

function dlBox(base, pdf, name, bullets) {
  return `<div class="dl-box">
    <div class="info">
      <strong>${name} &mdash; free PDF</strong>
      <ul>${bullets.map(b => `<li>${b}</li>`).join("")}</ul>
    </div>
    <a class="btn btn-primary" data-dl="${pdf.replace(/\.pdf$/, "")}"
       href="${base}assets/downloads/${pdf}" download>&#11015;&#65039; Download free PDF</a>
  </div>`;
}

/* ---------------- home ---------------- */

const homeBody = `
    <section class="hero">
      <div class="wrap">
        <p class="kicker">Free print-ready tools for Dungeon Masters</p>
        <h1>Run tighter tables with printable D&amp;D 5e tools</h1>
        <p class="lead">Beautifully laid-out, genuinely free PDFs: initiative trackers, DM screen cheat sheets, combat trackers and session recap sheets. No email required, no watermark &mdash; just download, print and play.</p>
        <div class="cta-row">
          <a class="btn btn-gold" href="#tools">Browse the toolkit</a>
          <a class="btn btn-ghost" href="guides/how-to-track-initiative/">Read the initiative guide</a>
        </div>
      </div>
    </section>
    <section class="block" id="tools">
      <div class="wrap">
        <h2 class="section-title">The DM toolkit</h2>
        <p class="section-sub">Every sheet below is a free PDF designed for US Letter and A4, in both color and ink-friendly layouts. Print a stack and keep them in your DM bag.</p>
        <div class="card-grid">
          ${PRODUCTS.map(p => `
          <article class="card">
            <div class="icon" aria-hidden="true">${p.icon}</div>
            <h3><a href="${p.slug}/">${p.name}</a></h3>
            <p>${p.desc}</p>
            <div class="meta">${p.meta.map(m => `<span>${m}</span>`).join("")}</div>
          </article>`).join("\n        ")}
        </div>
      </div>
    </section>
    <section class="block alt">
      <div class="wrap">
        <h2 class="section-title">Why paper still wins at the table</h2>
        <p class="section-sub">Apps crash, laptops create screens between you and the players. A well-designed sheet never updates mid-session and never needs charging.</p>
        <div class="card-grid">
          <article class="card">
            <h3>Designed by DMs, for tables</h3>
            <p>Every column exists because a real fight needed it: AC next to initiative, concentration boxes next to HP, a notes column wide enough for actual handwriting.</p>
          </article>
          <article class="card">
            <h3>Print-anywhere layouts</h3>
            <p>US Letter and A4 safe areas, generous margins for hole-punching, and high-contrast inks that survive a cheap office printer.</p>
          </article>
          <article class="card">
            <h3>Free means free</h3>
            <p>No email wall, no trial, no watermark across the initiative order. Download, photocopy for the whole table, done.</p>
          </article>
        </div>
      </div>
    </section>`;

/* ---------------- product pages ---------------- */

const productPages = [
  {
    slug: "initiative-tracker",
    title: "Free D&D 5e Initiative Tracker Printable PDF (22 Slots)",
    desc: "Download a free printable initiative tracker for D&D 5e. A 22-slot roster with AC, HP and notes columns, round counter strip and quick-reference sidebar. US Letter and A4 PDF.",
    h1: "D&D 5e Initiative Tracker &mdash; Printable PDF",
    lead: "A one-sheet initiative roster that survives a real session: 22 combatant slots, AC and HP columns side by side, and a round tracker that keeps the whole table honest.",
    pdf: "initiative-tracker.pdf",
    pdfBullets: ["2 pages, landscape", "US Letter &amp; A4 safe areas", "22 combatant slots + round strip"],
    inside: [
      "<strong>Initiative roster (22 slots)</strong> &mdash; initiative score, name, AC, HP max and a wide notes column, ordered top to bottom so you read the turn order like a script.",
      "<strong>Round &amp; turn strip</strong> &mdash; tick-boxes for rounds 1&ndash;20 plus a &lsquo;delayed/held action&rsquo; marker column so nobody gets skipped twice.",
      "<strong>Quick-reference sidebar</strong> &mdash; surprise rules, tie-breaking by Dexterity, and the readied-action trigger reminder, right where you write the order.",
    ],
    how: `<p>Print one per fight (or laminate one and use dry-erase markers). Write every combatant in initiative order before the first turn &mdash; players first, then monsters, then lair actions if you use them. During play, work straight down the sheet and back to the top, ticking the round box each time initiative order wraps.</p>
<p>The AC column sits next to the name so you can answer &ldquo;does a 17 hit the ogre?&rdquo; without flipping to the stat block. Use the HP column as damage tally marks rather than numbers &mdash; it is faster at the table and arithmetic errors drop to zero. The notes column earns its width for concentration spells, marks from hunters, and &ldquo;this one flees at half HP&rdquo; reminders to future-you.</p>`,
    printTip: "Print at 100% scale (&ldquo;Actual size&rdquo;, not &ldquo;Fit&rdquo;) so the ruling stays exactly 22 rows; margins are already sized for a three-hole punch.",
    faq: [
      ["Is this initiative tracker really free?", "Yes — no email, no account, no watermark. Download the PDF and print as many copies as your table needs."],
      ["Does it work for A4 as well as US Letter?", "The layout keeps every element inside an area that prints safely on both US Letter and A4 at 100% scale."],
      ["Is it compatible with D&D 5e?", "It is built around 5e initiative: Dexterity tie-breaks, ready and delay conventions, and standard stat-line needs. It works fine for Pathfinder 2e and other d20 systems too."],
      ["Can I type into it instead of printing?", "This is a print-first PDF. If you want a digital version, tell us on the contact page — enough requests and we will ship a fillable version."],
    ],
    related: ["dm-screen-cheat-sheet", "combat-tracker"],
  },
  {
    slug: "dm-screen-cheat-sheet",
    title: "Printable DM Screen Cheat Sheet PDF for D&D 5e (5 Inserts)",
    desc: "Free 5-page printable DM screen cheat sheet for D&D 5e: action economy, all 15 conditions, common DCs, cover, concentration and death saving throws. Letter & A4 PDF.",
    h1: "DM Screen Cheat Sheet &mdash; 5 Printable Inserts",
    lead: "Five dense, scannable reference pages sized to fold behind any DM screen: the rules you actually look up mid-fight, minus the flavor text.",
    pdf: "dm-screen-cheat-sheet.pdf",
    pdfBullets: ["5 pages, portrait", "US Letter &amp; A4 safe areas", "Conditions, DCs, action economy, death rules"],
    inside: [
      "<strong>Page 1 &mdash; Combat flow</strong> &mdash; action economy (action / bonus action / movement / reaction / free object interaction), attack and saving throw resolution, and opportunity attack triggers.",
      "<strong>Pages 2&ndash;3 &mdash; All 15 conditions</strong> &mdash; each condition in one line of effect plus one line of end-condition. Blinded through Unconscious, no page-flipping.",
      "<strong>Page 4 &mdash; Common DCs &amp; checks</strong> &mdash; the standard difficulty ladder, typical ability check examples, passive checks, cover (half / three-quarters / total) and dying rules with death save boxes.",
      "<strong>Page 5 &mdash; Concentration &amp; common snags</strong> &mdash; what breaks concentration, the DC formula, ready/delay reminders, and the grapple/shove contest rules.",
    ],
    how: `<p>Print all four pages, fold along the middle and stand them inside your screen landscape-style: combat flow and conditions facing you at the start of the fight, DCs and concentration one flip away. If your screen is short, trim the top margin &mdash; the header band is decorative, the tables are not.</p>
<p>Each block is written as a ruling, not a rule citation: &ldquo;Prone: melee attacks against it have advantage, ranged have disadvantage; ends by spending half its movement.&rdquo; That is the whole point of a cheat sheet &mdash; the fastest path from question to &ldquo;here is what happens&rdquo;.</p>`,
    printTip: "Choose grayscale if your table printer drinks color ink — the layout is tested to stay readable in pure black and white.",
    faq: [
      ["What size screen do these inserts fit?", "Pages print on US Letter / A4 and fold to fit standard landscape DM screens; trim margins for smaller folding screens."],
      ["Do the condition summaries match the official rules?", "They summarize the 5e condition definitions line for line in plain language. For exact wording, the SRD is the source of truth."],
      ["Can I edit the cheat sheet?", "The PDF is print-first. If you want a build-your-own version, request it on the contact page."],
      ["Is it free like the other sheets?", "Yes — all four pages, one PDF, zero cost, no email required."],
    ],
    related: ["condition-cards", "initiative-tracker"],
  },
  {
    slug: "combat-tracker",
    title: "Free Printable D&D 5e Combat Tracker PDF (8 Combatants)",
    desc: "Free printable combat tracker for D&D 5e: eight oversized combatant blocks with HP pips, concentration tracker and damage notes. Boss fights without losing count.",
    h1: "Combat Tracker &mdash; Printable PDF",
    lead: "Oversized blocks for up to eight combatants, with pip-style HP tracking and a concentration row &mdash; built for boss fights where three goblins and a dragon all have things going on.",
    pdf: "combat-tracker.pdf",
    pdfBullets: ["2 pages, landscape", "8 large combatant blocks", "HP pips + concentration tracker"],
    inside: [
      "<strong>Eight combatant blocks</strong> &mdash; name, initiative, AC, and a big HP pip field: shade pips down as damage lands, no mental subtraction mid-round.",
      "<strong>Concentration &amp; marks row</strong> &mdash; tick-boxes for concentration, bless, poisoned and &lsquo;bloodied at half&rsquo; per combatant.",
      "<strong>Turn wheel &amp; notes strip</strong> &mdash; round counter plus a wide strip for lair actions, legendary action budget and environmental effects.",
    ],
    how: `<p>Use one block per combatant &mdash; monsters and players both &mdash; and pre-fill the HP pips to each creature&rsquo;s maximum. When damage lands, cross off pips from the right; when healing lands, redraw them. The pip system is slower to start than writing numbers but radically faster in rounds three through ten, which is where combats actually live.</p>
<p>The marks row is for the three states DMs forget most: concentration (roll that Con save when the wizard takes a hit), conditions with saves, and bloodied &mdash; which most tables use as a cue for phase changes and morale checks.</p>`,
    printTip: "One sheet covers eight combatants; print page 2 double-sided so the notes strip is always on the back of a full fight.",
    faq: [
      ["How many combatants fit on one sheet?", "Eight blocks per sheet; print two sheets for big set-piece battles."],
      ["What are the HP pips for?", "Shade one pip per hit point (or per 5 HP for big monsters). It removes mid-round arithmetic entirely."],
      ["Does it replace the initiative tracker?", "It complements it: initiative tracker for order, combat tracker for state. Small fights need only the tracker."],
      ["Is it free?", "Yes, like everything on the site — free PDF, no email."],
    ],
    related: ["initiative-tracker", "dm-screen-cheat-sheet"],
  },
  {
    slug: "condition-cards",
    title: "Free Printable D&D 5e Condition Cards PDF (15 Cards)",
    desc: "Free printable D&D 5e condition cards: all 15 conditions as die-cut reference cards. Cut, fold over your DM screen, and end condition arguments at the table.",
    h1: "Condition Cards &mdash; 15 Printable Reference Cards",
    lead: "Fifteen cards, one per condition, each with the effect and its end-condition in plain language. Cut them out and clip them to your screen &mdash; when a player is poisoned, hand them the card.",
    pdf: "condition-cards.pdf",
    pdfBullets: ["2 pages, portrait", "15 die-cut cards", "Dashed cut lines + corner ticks"],
    inside: [
      "<strong>All 15 conditions</strong> &mdash; Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious and Exhaustion (6 levels).",
      "<strong>Effect + end-condition on every card</strong> &mdash; what it does to you and what removes it, in two lines each.",
      "<strong>Screen-fold header</strong> &mdash; fold the top band over your DM screen or binder edge so the condition name faces the players.",
    ],
    how: `<p>Print on cardstock if you have it (regular paper plus a laminator is even better), cut along the dashed lines, and keep the deck in an envelope taped inside your screen. When a condition lands on a character, slide the card across the table to that player &mdash; they read it, they own it, and you never re-explain frightened for the fourth time.</p>
<p>The exhaustion card is a six-step ladder rather than a binary state, which is why it gets the same card size as the others: level, effect, and the fact that only a long rest plus food and drink removes a level.</p>`,
    printTip: "Cardstock (65–80 lb / 170–220 gsm) feels great and survives greasy table hands; plain paper works fine if you plan to laminate.",
    faq: [
      ["Do the cards include Exhaustion?", "Yes — as a six-level ladder card, plus the other 14 standard conditions."],
      ["Are they double-sided?", "Single-sided by design: fold the header band over the screen so the name shows and the text faces you."],
      ["Can players use them too?", "Please do — that is the whole idea. Print a deck for the table, keep one at the screen."],
      ["What paper should I use?", "Cardstock if you have it, any paper if you laminate. Cut lines are printed for scissors or a paper trimmer."],
    ],
    related: ["dm-screen-cheat-sheet", "combat-tracker"],
  },
  {
    slug: "session-notes-template",
    title: "Free D&D Session Notes Template PDF (Printable Recap Sheet)",
    desc: "Free printable D&D session notes template: party status, NPCs met, loot, secrets revealed and next-session hooks on a two-page recap sheet. Letter & A4 PDF.",
    h1: "Session Notes Template &mdash; Printable Recap Sheet",
    lead: "The two-page sheet that remembers your campaign for you: who they met, what they took, which secrets slipped, and the three hooks you planted for next session.",
    pdf: "session-notes.pdf",
    pdfBullets: ["2 pages, landscape", "Party / NPC / loot / hooks sections", "Session header with date &amp; party level"],
    inside: [
      "<strong>Session header</strong> &mdash; session number, in-game date, real date, party level and who actually showed up.",
      "<strong>Party status board</strong> &mdash; each PC row with HP state, conditions, inspiration and gold delta &mdash; the numbers that need carrying into next session.",
      "<strong>NPCs met &amp; names dropped</strong> &mdash; the single most-forgotten category: names, first impression, and what they want.",
      "<strong>Loot, secrets &amp; hooks</strong> &mdash; items handed out, plot points the players learned, and three blank hook boxes &mdash; because a session that ends without a hook is a session that ends the campaign.",
    ],
    how: `<p>Fill it in during the last fifteen minutes of the session, not after &mdash; ask the players to recap out loud what happened while you write. The out-loud recap doubles as your plot-fixing window: whatever the players remember is what actually happened, regardless of your prep notes.</p>
<p>At the start of the next session, read the hooks box aloud as your cold open. It takes forty seconds and it re-immerses the table faster than any &lsquo;previously on&rsquo; speech.</p>`,
    printTip: "Print double-sided so the whole session lives on one physical sheet that clips into your campaign binder.",
    faq: [
      ["One sheet per session?", "Yes — the whole design assumes one session = one sheet in a growing campaign binder."],
      ["Does it work for online games?", "It prints beautifully, but many online DMs keep it open in a tablet PDF annotator instead."],
      ["Can my players fill parts of it?", "That works great — hand the loot and NPC sections to the party note-taker and keep status and hooks for yourself."],
      ["Is it free?", "Yes — free PDF, no email, print as many as your campaign runs."],
    ],
    related: ["initiative-tracker", "combat-tracker"],
  },
];

/* ---------------- guides ---------------- */

const guides = [
  {
    slug: "guides/how-to-track-initiative",
    title: "How to Track Initiative in D&D 5e: The Complete DM Guide",
    desc: "How initiative works in D&D 5e — rolling, tie-breaks, grouping monsters, tracking tools and the habits that keep combat fast. Includes a free printable tracker.",
    h1: "How to Track Initiative in D&D 5e",
    lead: "Rolling it is easy. Keeping a ten-creature fight moving for six rounds without skipping anyone is the actual skill. Here is the full method, from the roll to the habits that keep combat fast.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <h2>The initiative roll, start to finish</h2>
      <p>When combat begins, everyone rolls initiative: d20 + Dexterity modifier, including the DM for every monster group. Important: monsters of the same kind act together — you roll once for all six goblins and they share a turn. That single rule is the biggest initiative speed-up in the book and most tables ignore it.</p>
      <p>Write every result down before anyone acts. If a creature has a modifier to initiative (Alert feat, magic items, the Improved Initiative feature), it applies to the roll — not to a flat 10 in place of rolling unless the ability explicitly says so.</p>

      <h2>Ties: the Dexterity rule and the house-rule alternative</h2>
      <p>Officially, ties go to whoever has the higher Dexterity modifier; if those are also tied, roll off or let the players win ties. In practice many DMs run &ldquo;players before monsters&rdquo; on ties — it feels generous, costs nothing, and players never notice it is a house rule.</p>

      <h2>Three ways to physically track order (and when each wins)</h2>
      <table>
        <tr><th>Method</th><th>Best for</th><th>Weakness</th></tr>
        <tr><td>Written roster / tracker sheet</td><td>Any fight, any size; zero prep</td><td>You must announce whose turn it is</td></tr>
        <tr><td>Initiative tents (folded cards over the screen)</td><td>Tables where players track their own position</td><td>Prep before the fight; bad for surprise encounters</td></tr>
        <tr><td>Apps &amp; VTT trackers</td><td>Online play, huge battles</td><td>Screen between you and the table; battery, updates</td></tr>
      </table>
      <p>Our recommendation: a written roster for 95% of fights. A single <a href="../../initiative-tracker/">printable initiative tracker sheet</a> with 22 slots covers the biggest published adventures, and a pencil never crashes mid-boss.</p>

      <h2>The habits that actually make initiative fast</h2>
      <h3>1. Announce on-deck, every turn</h3>
      <p>&ldquo;Aria, you are up — Thorin, you are on deck.&rdquo; The on-deck call is the single highest-value sentence in combat DMing: it halves the &ldquo;wait, my turn?&rdquo; delay and lets the next player plan while the current one acts.</p>
      <h3>2. Group by roster position, not by creature type</h3>
      <p>If the wolves act between two players, they are physically between those players on your sheet. Do not sort monsters into a clump just because they rolled together — the order on paper should match the order out loud.</p>
      <h3>3. Tick the round box every wrap</h3>
      <p>Rounds are how you measure spell durations and the 1-minute/10-round effects. Tick a box every time the order returns to the top; durations become trivial subtraction.</p>
      <h3>4. Resolve held and ready actions immediately, not later</h3>
      <p>A readied action happens the moment its trigger fires — interrupt the current turn, resolve it, continue. If you park it to &ldquo;deal with it after,&rdquo; you will forget, and the player will stop ever readying actions.</p>

      <h2>Common initiative mistakes</h2>
      <ul>
        <li><strong>Rolling per monster.</strong> Roll per monster <em>type</em>; the pack of eight wolves gets one score.</li>
        <li><strong>Skipping delayed/readied participants.</strong> Mark them in the notes column the moment the player declares it — see our tracker's held-action markers.</li>
        <li><strong>Not writing down lair actions.</strong> Lair actions act at initiative count 20 (losing ties). Write &ldquo;Lair: 20&rdquo; in the roster like a combatant.</li>
        <li><strong>Erasing HP as numbers.</strong> Tally damage instead; arithmetic is where skipped turns are born.</li>
      </ul>

      ${dlBox("../../", "initiative-tracker.pdf", "Initiative Tracker", ["22 slots + round strip", "Free, no email", "US Letter &amp; A4"])}

      <h2>Surprise, and why it is not a round</h2>
      <p>Surprise is a condition on the surprised creatures' first turn, not a bonus round. Compare stealth rolls against passive Perception; surprised creatures cannot move or act on their first turn and cannot take reactions until that turn ends. Then initiative proceeds normally — the surprised wizard still acts on their count, they just lose the first lap.</p>

      <h2>The 60-second recap</h2>
      <p>Initiative is bookkeeping, but bookkeeping is pacing. A fight where everyone knows whose turn it is feels twice as fast as the same fight with three skipped rogues. Roll grouped, write everything, call on-deck, tick rounds — the rest is monsters making interesting choices.</p>
    </div></div></section>`,
    faq: [
      ["Do you roll initiative once per monster or per group?", "Per monster type/group — all identical creatures share one initiative roll and one turn."],
      ["What happens on an initiative tie in 5e?", "Higher Dexterity modifier goes first; if still tied, roll off (or let PCs beat NPCs as a common house rule)."],
      ["When do lair actions happen?", "At initiative count 20, losing ties. Write them into the roster like a combatant so they are never forgotten."],
      ["Can you ready actions outside combat?", "Readied actions are a combat mechanic. Outside combat, use passive checks or roll initiative the moment tension becomes action."],
    ],
    crumbs: [["/", "Home"], [null, "Guides"]],
  },
  {
    slug: "guides/what-goes-on-a-dm-screen",
    title: "What Goes on a DM Screen: The Essential Inserts for D&D 5e",
    desc: "What to put on your DM screen in D&D 5e — conditions, common DCs, death saves, session names, and the frequency-vs-urgency rule for choosing inserts.",
    h1: "What Goes on a DM Screen",
    lead: "A DM screen is prime real estate: four panels facing you that should answer questions in under two seconds. Here is how to choose what earns that space.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <h2>The rule: frequency &times; urgency</h2>
      <p>Every square inch of screen should host information you look up <strong>often</strong> and <strong>mid-action</strong>. The condition &lsquo;Frightened&rsquo; (every session, mid-attack) earns a panel; the armor table (once per level-up, between sessions) does not. Audit your screen with that one rule and half your clutter disappears.</p>

      <h2>The core four, facing you</h2>
      <h3>1. Conditions, one line each</h3>
      <p>Conditions are the most looked-up rule in 5e and the cheapest to summarize. One line of effect, one line of what ends it. Our <a href="../../dm-screen-cheat-sheet/">cheat sheet inserts</a> put all fifteen on a single panel — or use <a href="../../condition-cards/">condition cards</a> if you prefer handing the rule to the player.</p>
      <h3>2. Common DCs and the difficulty ladder</h3>
      <p>Very Easy 5 / Easy 10 / Medium 15 / Hard 20 / Very Hard 25 / Nearly Impossible 30 — plus two or three concrete examples per ability so your brain has a hook under pressure (&ldquo;Hard Wisdom: resist a banshee's wail&rdquo;).</p>
      <h3>3. Death saves, dying, stabilization</h3>
      <p>Death save DC 10, three successes stabilize, three failures die, damage while at 0 HP = instant failure (crit = two), 1 HP on a natural 20. You will run this rule at the worst possible moment; it belongs on paper.</p>
      <h3>4. Cover, opportunity attacks, and grappling</h3>
      <p>+2 / +5 AC &amp; Dex saves for half and three-quarters cover, total cover blocks targeting; opportunity attacks trigger on leaving <em>reach</em> not the 5-foot square; grapple and shove are Athletics vs Athletics/Acrobatics contests, not saves.</p>

      <h2>The outer panels, facing the players</h2>
      <p>Player-facing space is for shared state: the current <a href="../initiative-tracker/">initiative order</a> clipped where everyone can see it, condition cards folded over the top edge, and — the classic — a name-generation table or common-word glossary for your setting. The outer panels reduce the questions aimed at you; that is their whole job.</p>

      <h2>What to take OFF your screen</h2>
      <ul>
        <li><strong>Price lists and trade goods.</strong> Shopping happens between sessions; look it up then.</li>
        <li><strong>The full armor table.</strong> Once armor is bought, it is on the character sheet.</li>
        <li><strong>Monster stat blocks you taped up last month.</strong> Screens accrete. Prune monthly.</li>
        <li><strong>Anything you have genuinely memorized.</strong> Free the space for something you have not.</li>
      </ul>

      <div class="callout"><strong>Session state belongs on the screen too.</strong> A small sticky note with tonight's NPC names and the three secrets you intend to reveal turns a bland session into a tight one. Our <a href="../../session-notes-template/">session notes template</a> pairs well here: notes inside, rules on the panels.</div>

      <h2>Screens vs. laptops vs. no screen at all</h2>
      <p>A laptop holds infinite rules but also your dice roller, your music, and your attention. A physical screen answers conditions in two seconds and never pings. No screen at all — the open-table style — maximizes presence and trust, at the cost of memorizing more or prepping index cards. All three styles work; choose deliberately, and stock whichever surface you use with the same core four.</p>

      ${dlBox("../../", "dm-screen-cheat-sheet.pdf", "DM Screen Cheat Sheet", ["5 inserts, all core four", "Free, no email", "US Letter &amp; A4"])}

      <h2>Quick checklist</h2>
      <ul>
        <li>All 15 conditions, one line each</li>
        <li>DC ladder with examples</li>
        <li>Dying rules and death saves</li>
        <li>Cover, opportunity attacks, grapple/shove</li>
        <li>Initiative order visible to players</li>
        <li>Tonight's names + secrets on a sticky note</li>
      </ul>
    </div></div></section>`,
    faq: [
      ["What should I put on the inside of my DM screen?", "The core four: conditions, common DCs, death/dying rules, and cover/opportunity attack/grapple rules — everything you look up mid-fight."],
      ["What goes on the outside of a DM screen?", "Player-facing state: the initiative order, condition cards, and shared references like name tables."],
      ["How tall should a DM screen be?", "Tall enough to hide your notes, short enough that you still see the players' faces — about 8–10 inches is the sweet spot for standard screens."],
      ["Do experienced DMs still use screens?", "Yes — for dice fudging options, stat privacy and rule speed. What they do not do is hide behind them: screen for rules, eyes on the table."],
    ],
    crumbs: [["/", "Home"], [null, "Guides"]],
  },
  {
    slug: "guides/how-to-run-combat",
    title: "How to Run Combat in D&D 5e: Cheat Sheet for New DMs",
    desc: "Learn to run D&D 5e combat step by step — surprise, initiative, turn structure, the rules you look up mid-fight, and the habits that keep fights fast. Free cheat sheet PDF.",
    h1: "How to Run Combat in D&amp;D 5e",
    lead: "The six-step combat loop, the rules you actually look up mid-fight, and the three habits that separate a smooth fight from a slog — a cheat sheet for new DMs.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <h2>The combat loop in six steps</h2>
      <ol>
        <li><strong>Establish positions.</strong> Where is everyone when steel gets drawn? Set the scene before any rolls — it prevents the &ldquo;wait, I was behind the pillar&rdquo; argument.</li>
        <li><strong>Check for surprise.</strong> Compare the ambushers' group Stealth against the defenders' passive Perception. Surprised creatures skip their actions and reactions on their <em>first turn only</em> — surprise is not a free round.</li>
        <li><strong>Roll initiative.</strong> Everyone rolls d20 + Dexterity. Identical monsters share one roll and one turn — the single biggest speed-up in the rules. Ties go to higher Dexterity. Write the whole order down before anyone acts; our <a href="../../initiative-tracker/">initiative tracker sheet</a> exists for exactly this.</li>
        <li><strong>Take turns, top to bottom.</strong> On a turn: move up to speed, take one Action, take one Bonus Action <em>only if a feature grants it</em>, and interact with one object for free. Reactions happen any time they're triggered.</li>
        <li><strong>Wrap each round.</strong> When the order returns to the top, a round has passed — tick it off. Durations (1 minute = 10 rounds) count down from there.</li>
        <li><strong>End the fight honestly.</strong> Most monsters flee at half strength or surrender when the tide turns. A fight that ends on morale is a fight that ends interesting.</li>
      </ol>

      <h2>The rules you look up mid-fight (so learn these first)</h2>
      <h3>Attack rolls and saving throws</h3>
      <p>Attack: d20 + ability modifier + proficiency vs the target's AC. A natural 20 always hits and doubles the dice; a natural 1 always misses. Saves: the caster's DC is 8 + proficiency + casting ability; the target rolls d20 + the named save, meeting or beating the DC succeeds.</p>
      <h3>Death saves</h3>
      <p>At 0 HP a creature falls unconscious and rolls a DC 10 death save at the start of each of its turns: three successes stabilize, three failures die. Any damage at 0 HP is an automatic failure (a critical hit is two). A natural 20 brings the creature back to 1 HP. This rule fires at the worst moment — keep it on paper, not in memory, with our <a href="../../dm-screen-cheat-sheet/">DM screen cheat sheet</a>.</p>
      <h3>Cover</h3>
      <p>Half cover (+2 AC and Dex saves): another creature, furniture, a tree trunk. Three-quarters (+5): an arrow slit, thick fog. Total cover: can't be targeted at all.</p>
      <h3>Opportunity attacks</h3>
      <p>Triggered when a hostile <em>leaves your reach</em> — not when it circles around inside it, not on teleportation, not when it's pushed. Disengage prevents it. One reaction per round, so a creature can only punish one exit.</p>
      <h3>Grappling and shoving</h3>
      <p>Athletics check contested by the target's Athletics or Acrobatics (their choice). Win the grapple: their speed is 0. Win the shove: knocked prone or pushed 5 feet. No saving throws involved — it's a contest.</p>

      <h2>Three habits that keep fights fast</h2>
      <p><strong>1. Call the on-deck player.</strong> &ldquo;Aria, you're up — Thorin, you're on deck.&rdquo; Half of combat slowness is players who didn't know their turn was coming. The on-deck call eliminates it.</p>
      <p><strong>2. Track state on paper, not in your head.</strong> HP as tally marks, concentration as a checkbox, bloodied as a circled name. Round four of a seven-creature fight is where mental tracking collapses — a printed <a href="../../combat-tracker/">combat tracker with HP pips</a> makes round ten as calm as round one.</p>
      <p><strong>3. Average damage for hordes.</strong> When six goblins hit, don't roll six dice — take the average (it's printed on the stat block) or roll once and apply it to all. Nobody notices; everybody notices the wait you removed.</p>

      <h2>Common new-DM mistakes</h2>
      <ul>
        <li><strong>Rolling initiative per monster.</strong> Roll per monster <em>type</em>. The wolf pack shares one initiative.</li>
        <li><strong>Forgetting lair actions.</strong> They trigger at initiative count 20, losing ties — write &ldquo;LAIR: 20&rdquo; into the roster like a combatant.</li>
        <li><strong>Stopping the fight to check a rule.</strong> Rule call in ten seconds, write it down, look it up after the session. Momentum is worth more than a perfect ruling.</li>
        <li><strong>One-note monsters.</strong> Give each monster one tactic: the wolf pack trips, the archer kite, the ogre shoves into hazards. Fights get memorable and you never open the stat block twice.</li>
      </ul>

      <h2>Your turn (so to speak)</h2>
      <p>Print a tracker, fold a cheat sheet into your screen, and run the next fight by the loop above. If you want the whole toolkit — initiative tracker, screen inserts, combat tracker and a session recap sheet — start with the <a href="../../dm-screen-cheat-sheet/">cheat sheet inserts</a> and build from there. Roll well.</p>
    </div></div></section>`,
    faq: [
      ["How long should a combat encounter last in 5e?", "Most published fights run 3–5 rounds; at a healthy pace that's 15–30 real minutes. If a routine fight passes 45 minutes, cut monster HP or have reinforcements never arrive."],
      ["What happens when a creature drops to 0 HP?", "It falls unconscious and rolls death saves (DC 10) each turn: three successes stabilize, three failures die, any damage taken is an automatic failure."],
      ["Can players delay their turn in 5e?", "There is no delay action in 5e — readied actions (declare action + trigger, resolved as a reaction) are the supported tool."],
      ["How do I make combat more interesting as a new DM?", "Give every monster one signature tactic, use the environment (hazards, cover, chandeliers), and end fights on morale — monsters flee, surrender, or bargain."],
    ],
    crumbs: [["/", "Home"], [null, "Guides"]],
  },
  {
    slug: "guides/conditions-explained",
    title: "D&D 5e Conditions Explained: Every Condition in Plain Language",
    desc: "All 15 D&D 5e conditions explained in plain language — what each does, what ends it, how they stack, and how to run them at the table without page-flipping.",
    h1: "Every D&amp;D 5e Condition, Explained",
    lead: "Fifteen conditions, zero page-flipping: what each one does, what ends it, how they stack — and the table habits that make them effortless.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <p>Conditions are the most looked-up rules in 5e &mdash; and the cheapest to master, because each one is two sentences: what it does, and what ends it. Here is the whole set in plain language, grouped by how they actually show up at the table.</p>

      <h2>The perception conditions</h2>
      <p><strong>Blinded</strong> &mdash; can't see; automatically fails checks that need sight. Attacks against it have advantage; its own attacks have disadvantage. Ends when the cause is removed (fog clears, blindness spell ends).</p>
      <p><strong>Deafened</strong> &mdash; can't hear; auto-fails checks that need hearing. Rarely decisive, occasionally devastating (that alarm you didn't hear).</p>

      <h2>The social conditions</h2>
      <p><strong>Charmed</strong> &mdash; can't attack the charmer, and the charmer has advantage on social ability checks with it. Note what it <em>doesn't</em> do: it doesn't grant mind control or bypass violence from other party members. Runs on spell durations.</p>
      <p><strong>Frightened</strong> &mdash; disadvantage on ability checks and attack rolls while the source of fear is in sight, and it cannot <em>willingly</em> move closer to that source. The "willingly" matters: pushed by thunderwave? Fine. Walking in on its own turn? Not allowed.</p>

      <h2>The action-killers</h2>
      <p><strong>Incapacitated</strong> &mdash; the root condition: no actions, no reactions. Several heavier conditions include it.</p>
      <p><strong>Paralyzed</strong> &mdash; incapacitated, can't move or speak, auto-fails Strength and Dex saves, and &mdash; the big one &mdash; any attack from within 5 feet that hits is a <strong>critical hit</strong>. Paralysis plus a rogue in melee is a war crime; use it on your players sparingly.</p>
      <p><strong>Stunned</strong> &mdash; paralyzed-lite: incapacitated, can't move, auto-fails Str/Dex saves, attacks against it have advantage &mdash; but no auto-crits.</p>
      <p><strong>Unconscious</strong> &mdash; the dying state: everything from paralyzed, plus it drops what it holds, is unaware of surroundings, and shouts don't wake it. Melee hits within 5 ft auto-crit. Ends by regaining HP or being shaken awake as an action.</p>
      <p><strong>Petrified</strong> &mdash; turned to stone: incapacitated, resistant to <em>all</em> damage, immune to poison and disease, auto-fails Str/Dex saves. A petrified character can be carried out of a collapsing dungeon by the party &mdash; it's a rescue timer, not a death sentence.</p>

      <h2>The movement-killers</h2>
      <p><strong>Grappled</strong> &mdash; speed becomes 0. If the grappler moves, it can drag you at half speed. Escapes when the grappler is incapacitated, the effect ends, or you're teleported away. A grappled creature can still attack, cast, and shove.</p>
      <p><strong>Prone</strong> &mdash; the self-inflicted one: only crawl or spend half your speed to stand. Melee attacks against a prone creature have advantage, ranged have disadvantage, and its own attacks have disadvantage. Dropping prone is free &mdash; tactical against archers, terrible against melee.</p>
      <p><strong>Restrained</strong> &mdash; the web/restraint state: speed 0, attacks against it have advantage, its attacks have disadvantage, and it has disadvantage on Dexterity saves.</p>

      <h2>The oddballs</h2>
      <p><strong>Invisible</strong> &mdash; can't be seen without magic; its attacks have advantage, attacks against it have disadvantage. Invisibility does not silence footsteps &mdash; hiding is still a Stealth check.</p>
      <p><strong>Poisoned</strong> &mdash; disadvantage on attack rolls and ability checks. Simple, common, and a reminder to check whether that poison deals damage or imposes the condition &mdash; they're different effects.</p>
      <p><strong>Exhaustion (six levels)</strong> &mdash; the ladder: 1) disadvantage on ability checks, 2) speed halved, 3) disadvantage on attacks <em>and</em> saves, 4) hit point maximum halved, 5) speed 0, 6) death. A long rest plus food and drink removes one level; <em>greater restoration</em> (5th level or higher) removes all of them. Exhaustion is the DM's best pacing tool: forced marches, starvation, and drowning all speak it.</p>

      <h2>How conditions stack</h2>
      <p>Conditions stack freely &mdash; a creature can be grappled, poisoned and frightened at once &mdash; but advantage and disadvantage do not: multiple sources of either still amount to one, and one of each cancels out. Track the conditions, apply the net effect once, move on.</p>

      <h2>Running them without page-flipping</h2>
      <p>Two habits cover ninety percent of condition play. First: when a condition lands on a character, hand the player the rule &mdash; our <a href="../../condition-cards/">printable condition cards</a> exist for exactly this; slide the card across, they read it, they own it. Second: keep the one-line summary at your screen &mdash; all fifteen fit on two inserts of the <a href="../../dm-screen-cheat-sheet/">DM screen cheat sheet</a>, with each condition's end-condition printed under it.</p>
      <p>For the fights where three conditions fly at once, the marks row on the <a href="../../combat-tracker/">combat tracker</a> has checkboxes for concentration, poison and bloodied &mdash; tick them as they land, untick as they save.</p>
    </div></div></section>`,
    faq: [
      ["Does poison damage also poison the target?", "Not automatically — a poison effect either deals damage, imposes the poisoned condition, or both, as written in the stat block or spell. Read the effect, don't assume."],
      ["Can a grappled creature still attack?", "Yes — grappled only sets speed to 0. It can attack, cast spells, shove, and even grapple back."],
      ["Do two sources of frightened give double disadvantage?", "No. Advantage and disadvantage don't stack — multiple sources still count as one, and they cancel each other out."],
      ["How do I remove exhaustion quickly?", "One long rest with food and drink removes one level; the greater restoration spell cast at 5th level or higher removes all levels."],
    ],
    crumbs: [["/", "Home"], [null, "Guides"]],
  },
  {
    slug: "guides/session-zero-checklist",
    title: "Session Zero Checklist for D&D: Everything to Cover (Free Sheet)",
    desc: "The complete session zero checklist for D&D campaigns — table rules, safety tools, character creation, scheduling and expectations, plus a free printable recap sheet.",
    h1: "The Session Zero Checklist",
    lead: "Everything to cover in the meeting that decides whether your campaign lasts three sessions or thirty — as a working checklist you can run straight down.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <p>Session zero is the meeting before the game: no dice, no combat, just the table agreeing on what campaign they're all signing up for. Skip it and you don't find out until session four that one player expected politics and another expected dungeon crawls. Here is the checklist, in the order that works at a real table.</p>

      <h2>1. The pitch (five minutes)</h2>
      <p>One paragraph: genre, tone, and the shape of the campaign. &ldquo;Noble intrigue in a collapsing empire, mostly roleplay with set-piece fights, you're all court agents&rdquo; gives everyone a yes/no decision immediately. If a player's face falls, better now than in week three.</p>

      <h2>2. Safety tools (ten minutes)</h2>
      <p>Pick your set and say it out loud: <strong>lines and veils</strong> (hard bans vs fade-to-black topics), the <strong>X-card</strong> or a simple &ldquo;pause&rdquo; hand signal anyone can use, and an open-door policy — leaving a scene is always fine, no questions asked. This isn't bureaucracy; it's the difference between a tense scene and a bad night.</p>

      <h2>3. Table rules (ten minutes)</h2>
      <ul>
        <li><strong>Rules authority:</strong> DM rulings stand mid-session, rules debated after — say it explicitly.</li>
        <li><strong>Table tech:</strong> phones okay for dice apps? Laptops? PvP — in or out? (Most tables: out.)</li>
        <li><strong>Attendance:</strong> missing players' characters become background NPCs; no XP penalty.</li>
        <li><strong>Scheduling:</strong> cadence (weekly/biweekly), day, start time, and who chases stragglers — agree on the chase mechanism now, while everyone likes each other.</li>
      </ul>

      <h2>4. Character creation (thirty minutes)</h2>
      <p>Decide as a table: point buy or rolled stats (rolled in front of witnesses), allowed books, and <strong>the party composition conversation</strong> — not &ldquo;we need a healer&rdquo; but &ldquo;what does this group look like?&rdquo; Two warlocks and a bard can work; four loner edgelords with no reason to cooperate cannot, and session zero is where you say so. Require every player to answer three questions: why are you here, whom do you already know at this table, and what do you want from the campaign?</p>

      <h2>5. Expectations and hooks (ten minutes)</h2>
      <p>Each player states one thing they want to see (a heist, a redemption arc, dragons) and one thing they'd rather avoid. Write these down — they're your prep priorities for the next three months. Then seed the inter-character bonds: rivals, siblings, debtors, war buddies.</p>

      <h2>6. Logistics (five minutes)</h2>
      <p>Where do you play, who hosts, snacks rotation, and how the group communicates between sessions (group chat norms: scheduling yes, rules-lawyering no). Decide what happens when someone can't make it — quorum rules, cancellation cutoff time.</p>

      <h2>What you walk out with</h2>
      <ul>
        <li>A campaign pitch everyone said yes to</li>
        <li>Safety tools agreed and understood</li>
        <li>Characters built with bonds between them</li>
        <li>A schedule with a real cadence</li>
        <li>Each player's wants-and-avoids list</li>
      </ul>
      <p>Write all of it on one sheet and keep it in your campaign binder — along with a <a href="../../session-notes-template/">session notes template</a> for every session that follows. The session zero sheet is page one of your campaign's memory.</p>

      <h2>Common session zero mistakes</h2>
      <p><strong>Treating it as character creation night.</strong> Building sheets takes the whole session and nothing else gets covered — pre-build or budget strict time. <strong>Skipping safety tools because &ldquo;we're all friends.&rdquo;</strong> Friends especially deserve the shortcut. <strong>No written record.</strong> The agreement you don't write down is the agreement that's re-litigated at session six. And <strong>skipping session zero entirely for a one-shot</strong> — even a one-shot deserves the ten-minute version: pitch, lines and veils, party bonds.</p>
    </div></div></section>`,
    faq: [
      ["How long should a session zero take?", "One to two hours for the full checklist; a one-shot needs only the ten-minute version — pitch, safety tools and party bonds."],
      ["Do you play any D&D in session zero?", "Usually no combat and no plot — but a five-minute 'how does your character know the others' round doubles as warm-up roleplay."],
      ["What if a player realizes the campaign isn't for them?", "That's session zero doing its job — better a graceful exit before session one than a ghost seat by session three."],
      ["Where do I write all this down?", "One sheet in your campaign binder; pair it with a session notes template so every following session gets the same treatment."],
    ],
    crumbs: [["/", "Home"], [null, "Guides"]],
  },
  {
    slug: "guides/metal-vs-resin-dice",
    title: "Metal vs Resin Dice: Which Should You Buy? (Honest Guide)",
    desc: "Metal vs resin D&D dice compared honestly: weight, rolling, durability, price, table safety and which to buy first — from weight specs to rolling etiquette.",
    h1: "Metal vs Resin Dice: Which Should You Buy?",
    lead: "The honest comparison every dice buyer deserves — weight, feel, durability, price and table safety — plus which set to buy first when you can only buy one.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <p>Every tabletop player hits this question within a year of the hobby, and the internet's answer is usually &ldquo;buy both&rdquo; — which is technically correct and completely unhelpful. Here is the actual comparison, number by number.</p>

      <h2>The honest numbers</h2>
      <table>
        <tr><th></th><th>Metal dice</th><th>Resin dice</th></tr>
        <tr><td>Weight (7-piece set)</td><td>120&ndash;160 g</td><td>25&ndash;45 g</td></tr>
        <tr><td>Typical price</td><td>$20&ndash;$60</td><td>$8&ndash;$25</td></tr>
        <tr><td>Drop test</td><td>Survives; dents soft tables</td><td>Chips if rolled off tables repeatedly</td></tr>
        <tr><td>Balance</td><td>Solid castings roll true</td><td>Good sets roll true; cheap sets can bias</td></tr>
        <tr><td>Table safety</td><td>Needs a tray, always</td><td>Safe on most surfaces</td></tr>
        <tr><td>Maintenance</td><td>Keep dry, wipe occasionally</td><td>None</td></tr>
      </table>

      <h2>What metal actually feels like</h2>
      <p>A zinc-alloy d20 weighs about what an entire resin set does. That weight is the entire product: the <em>thunk</em> when it lands, the authority when it rolls, the small ritual of shaking a fistful of cold metal before a save that matters. The downsides are equally real — metal dice will mark a bare wooden table (a folding tray is not optional, it is part of the purchase), they are loud in shared spaces, and a full metal set costs two to three times its resin twin.</p>

      <h2>What resin does better</h2>
      <p>Modern resin sets come with sharp edges, deep layered colors and glitter pours that metal cannot imitate at any price — the visual variety is unmatched. They're quiet, light, table-friendly, and cheap enough to own one per character (which is, let's be honest, how this works). Two honest caveats: very cheap resin sets can arrive with visible mold seams or off-center numbers, and sharp-edged sets chip if you roll them off the table every session. Buy from shops that hand-inspect sets before shipping — it matters more than the material does.</p>

      <h2>The balance question, answered</h2>
      <p>Players ask whether metal dice roll &ldquo;fairer.&rdquo; Both materials roll true when manufactured properly; neither material is inherently more random. What actually biases dice is air bubbles inside resin (visible in cheap sets) and worn plating on very old metal dice. If you can see through a die and spot a bubble near the core, that die belongs in the villain jar.</p>

      <h2>So which do you buy first?</h2>
      <p><strong>If you play mostly at home:</strong> start metal. The tray comes with the lifestyle, and the weight genuinely changes how rolling feels. Our friends at <a href="https://kylin-feng.github.io/dice-goblin-shop/products/metal-dice-bundle/" target="_blank" rel="noopener">Dice Goblin bundle a metal set with a folding tray and pouch</a> for about the price most shops charge for the dice alone.</p>
      <p><strong>If you play at stores, cons or other people's tables:</strong> start resin — quiet, light, forgiving — and upgrade to metal once you know your table manners won't get you disinvited.</p>
      <p><strong>If you're buying a gift:</strong> metal, always. Nobody unwraps zinc alloy and stays calm.</p>

      <h2>Care, briefly</h2>
      <ul>
        <li>Metal: dry storage, occasional soft-cloth wipe, never leave a set in a damp bag (plating dislikes long baths).</li>
        <li>Resin: keep them off direct sunlight for months at a time (yellowing), and away from the edge of the table.</li>
        <li>Both: roll in a tray. A <a href="https://kylin-feng.github.io/dice-goblin-shop/products/folding-dice-tray/" target="_blank" rel="noopener">snapping folding tray</a> costs less than replacing one d20 you loved.</li>
      </ul>

      <h2>The real answer</h2>
      <p>The internet was right: eventually you own both — resin for travel and tavern nights, metal for the boss fight. But the order matters less than buying a set someone inspected before it shipped. Roll well.</p>
    </div></div></section>`,
    faq: [
      ["Are metal dice worth the extra cost?", "If you play weekly at home — yes; the feel and durability justify it. Casual or travel players get 90% of the joy from a good resin set at a third of the price."],
      ["Do metal dice damage tables?", "On bare wood they can dent and scratch — that's why every metal set should be paired with a rolling tray, which most bundles include."],
      ["Are resin dice fair or balanced?", "Quality resin sets roll as true as metal; the risk is air bubbles in cheap sets, which you can usually spot by holding a die up to the light."],
      ["What dice should a beginner buy first?", "A resin 7-piece set plus a folding tray — quiet, table-safe and inexpensive — then add a metal set once you know how often you'll actually play."],
    ],
    crumbs: [["/", "Home"], [null, "Guides"]],
  },
  {
    slug: "guides/dm-prep-checklist",
    title: "DM Prep: How to Prepare a D&D Session in 30 Minutes",
    desc: "A 30-minute DM prep routine that covers scene list, stat blocks, maps, names and a recap plan — prep less, improvise better, and never blank mid-session again.",
    h1: "DM Prep in 30 Minutes",
    lead: "The session-prep routine that ends the 3 a.m. panic: five blocks, thirty minutes, and a game that survives whatever your players decide to do.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <p>Over-prepping is the most common DM failure mode: forty hours of worldbuilding, zero hours rehearsing what happens when the players ignore it. The 30-minute routine below assumes you already know where the campaign is going — it preps <em>this session</em>, not the setting.</p>

      <h2>Minute 0&ndash;5: The recap hook</h2>
      <p>Reread last session's <a href="../../session-notes-template/">notes sheet</a> and write one sentence that starts tonight's game: the unfinished threat, the promised meeting, the cliffhanger. Reading this aloud is your cold open — it re-immerses the table in forty seconds and tells you what the first scene is.</p>

      <h2>Minute 5&ndash;15: The scene list</h2>
      <p>Write three to five scenes you expect, one line each: &ldquo;1. Ambush on the road &mdash; wolves, morale break at half. 2. Arrival at Millbrook, innkeeper Greta wants help. 3. The mill at night &mdash; smugglers, a bargained fight.&rdquo; This is the single highest-value prep artifact: not a script, just likely destinations. When players zag, you keep the list and change the route.</p>
      <p>For each fight scene, note the stat blocks you'll need and print or bookmark them. Pre-roll nothing else.</p>

      <h2>Minute 15&ndash;20: Names and faces</h2>
      <p>Ten NPC names on an index card, with one-word hooks (Greta &mdash; owes a debt; Captain Vole &mdash; vain, bribable). The difference between a living town and cardboard is whether people have names when players ask. Any name works; consistency is what matters — write down every name you improvise during the game too.</p>

      <h2>Minute 20&ndash;25: The battle math</h2>
      <p>For the likely fight: how many enemies, when they arrive, and what makes them quit. Fill a <a href="../../combat-tracker/">combat tracker</a> in advance &mdash; name blocks, HP pips, initiative for monster groups you can pre-roll. Six goblins pre-blocked saves ninety seconds of table setup, and ninety seconds of setup is where combats go to die.</p>

      <h2>Minute 25&ndash;30: The safety net</h2>
      <p>Three improv anchors for when players ignore your scene list: a complication (the town bell rings mid-negotiation), a person (someone from a PC's backstory walks in), and a place (the door they haven't opened). You will not need all three; needing one of them is certain. Fold the DM screen inserts &mdash; conditions and DCs from the <a href="../../dm-screen-cheat-sheet/">cheat sheet</a> &mdash; and you're done.</p>

      <h2>What this routine deliberately skips</h2>
      <ul>
        <li><strong>Full dungeon mapping.</strong> Sketch rooms as needed; players imagine more than any map shows.</li>
        <li><strong>Dialogue scripts.</strong> Know what an NPC <em>wants</em>, not what they say.</li>
        <li><strong>Loot tables.</strong> Decide treasure after you see what the fight felt like.</li>
        <li><strong>&ldquo;Balanced&rdquo; encounters.</strong> Balance at the table via monster morale and reinforcements, not in the spreadsheet.</li>
      </ul>

      <h2>After the session (five minutes)</h2>
      <p>Fill the <a href="../../session-notes-template/">session notes sheet</a> while players recap out loud — party status, NPCs met, loot, and three hooks for next time. Those five minutes are next week's minute 0&ndash;5 already done.</p>

      <h2>Why 30 minutes works</h2>
      <p>Short prep forces prioritization onto the things that actually break sessions — blanking on names, fumbling combat setup, no plan for the zag — instead of the things that feel productive but never come up. Prep the seams, improvise the middle, and trust the table to fill it with something better than you planned anyway.</p>
    </div></div></section>`,
    faq: [
      ["How long should DM prep take per session?", "For most sessions, 30 focused minutes plus a 5-minute post-session recap beats long prep sprees — short prep prioritizes what actually breaks sessions mid-game."],
      ["What should a new DM prepare first?", "A scene list, the stat blocks for one likely fight, ten NPC names, and one recap sentence to open the session. Everything else can be improvised."],
      ["How do I prep when I don't know what players will do?", "Prep destinations, not routes: 3–5 likely scenes plus three improv anchors (a complication, a person, a place) to deploy when players zag."],
      ["Should I pre-roll monster initiative?", "Yes — rolling initiative for monster groups in advance and pre-blocking a combat tracker saves the table-setup stall where most combats lose energy."],
    ],
    crumbs: [["/", "Home"], [null, "Guides"]],
  },
  {
    slug: "guides/how-to-run-a-one-shot",
    title: "How to Run a One-Shot in D&D 5e: A Complete Guide",
    desc: "How to run a great D&D one-shot: structure, pregenerated characters, the three-act shape, pacing, and the mistakes that kill single-session games.",
    h1: "How to Run a One-Shot",
    lead: "One session, complete story, no campaign commitment — the complete guide to structuring, pacing and landing a single-night adventure.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <p>One-shots are the hardest format in DMing: you get one evening to introduce characters, build tension, and land an ending — with no next session to fix what went wrong. Here's the structure that consistently works.</p>

      <h2>Start with pregenerated characters</h2>
      <p>Character creation eats 90 minutes of your only session. Bring 5&ndash;6 pregen characters with one hook each baked in — &ldquo;you owe the innkeeper money,&rdquo; &ldquo;you've hunted this cult before.&rdquo; Players pick in thirty seconds, and every hook is a lever you can pull later. Let players reskin names and pronouns; ownership matters, stats don't.</p>

      <h2>The three-act one-shot shape</h2>
      <p><strong>Act 1 (45 min): a strong opening scene.</strong> Start in motion — the tavern is already on fire, the auction is already going wrong. Introduce the problem, the stakes, and one memorable NPC in a single scene, then let the players commit.</p>
      <p><strong>Act 2 (90 min): investigation plus one fight.</strong> Three clues pointing at the truth (three, because players will miss one and misread another), one combat that teaches the villains' trick, and a discovery that recontextualizes the opening — the kind stranger from scene one was behind it all along.</p>
      <p><strong>Act 3 (45 min): the climax and a real ending.</strong> The showdown, the choice that matters, and — this is what separates one-shots from campaign filler — an epilogue for each character. Two sentences each: what the rogue did with the reward, where the paladin rode next. Endings are why people remember one-shots.</p>

      <h2>Pacing rules that save one-shots</h2>
      <ul>
        <li><strong>Hard scene cuts.</strong> When a scene's point is made, cut — no walking out of buildings, no shopping. "You emerge into the noon market" is a legitimate transition.</li>
        <li><strong>One fight minimum, two maximum.</strong> A one-shot with three fights is a dungeon crawl wearing a costume.</li>
        <li><strong>Failure advances the plot.</strong> If the players lose the Act 2 fight, the villains accelerate their plan — the story moves either way. Never end a scene on a dead stop.</li>
        <li><strong>The clock is real.</strong> Put a visible timer in the fiction — dawn, the tide, the eclipse. One-shots with clocks end on time; one-shots without them end at 2 a.m. in the middle of a corridor.</li>
      </ul>

      <h2>Prep for a one-shot: one hour, not ten</h2>
      <p>Use the <a href="../../dm-prep-checklist/">30-minute prep routine</a> with one-shot adjustments: the scene list is your three acts, the NPC names double as epilogue material, and the battle math covers your two fights. Fill a <a href="../../combat-tracker/">combat tracker</a> per fight in advance — table setup is where single-session momentum dies. The <a href="../../session-notes-template/">session notes sheet</a> still applies: even one-shots deserve a recap of which endings you actually delivered, because players will ask to revisit these characters.</p>

      <h2>The ten-minute session zero still applies</h2>
      <p>Even for one night: pitch the tone (heist comedy vs folk horror are different evenings), run lines-and-veils in one sentence, and ask each player what their character wants from tonight. The lightweight version of the <a href="../../session-zero-checklist/">session zero checklist</a> takes ten minutes and doubles the emotional payoff.</p>

      <h2>Where one-shots come from</h2>
      <p>Steal structures, not plots: any heist movie, any locked-room mystery, any western standoff. A one-shot built on "the party must escort X to Y before Z" is prep-free — the story writes itself from what the players do en route. If you're stuck, open with the reward and end with the bill coming due.</p>
    </div></div></section>`,
    faq: [
      ["How long should a D&D one-shot be?", "Plan for 3–4 hours: a 45-minute opening, 90-minute middle with one fight, and a 45-minute climax plus character epilogues."],
      ["Should players make characters for a one-shot?", "Use pregenerated characters with built-in hooks — character creation eats a third of your only session. Let players rename and reskin them."],
      ["What makes a good one-shot story?", "A strong opening scene, three clues to the truth, one twist that recontextualizes the opening, and a real ending with an epilogue per character."],
      ["Can a one-shot become a campaign?", "Yes — keep the notes sheet, deliver satisfying endings anyway, and if players ask to return, you already have a world they care about."],
    ],
    crumbs: [["/", "Home"], [null, "Guides"]],
  },
  {
    slug: "guides/what-dice-do-you-need",
    title: "What Dice Do You Need to Play D&D? (7-Dice Set Explained)",
    desc: "Exactly what dice you need for D&D 5e: the 7-dice set explained die by die, what each is rolled for, how many sets to own, and cheap vs premium options.",
    h1: "What Dice Do You Need to Play D&amp;D?",
    lead: "The seven-dice set explained die by die — what each one rolls, why the d20 rules the game, and what to actually buy first.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <p>D&D uses seven dice shapes, and you'll recognize six of them by dinner time. Here's the whole toolkit, what each die is actually for, and what to buy when you're starting out.</p>

      <h2>The d20 — the engine of the game</h2>
      <p>The twenty-sided die is the star: attack rolls, ability checks, saving throws and death saves all start with a d20. When someone says &ldquo;roll a perception check&rdquo; or &ldquo;does a 17 hit,&rdquo; this is the die. If you buy one nice die, make it this one — it touches the table more than the other six combined.</p>

      <h2>The rest of the set</h2>
      <ul>
        <li><strong>d12</strong> — big hits: greataxes, the nastier dragon breaths. Rarer, beloved.</li>
        <li><strong>d10</strong> — weapons like longswords and fireballs. Two d10s (one marked in tens) roll d100 for wild-magic tables.</li>
        <li><strong>d8</strong> — the workhorse damage die: longswords at one hand, cantrips that grew up.</li>
        <li><strong>d6</strong> — everyone's favorite: shortswords, firebolt, hit points at first level. You'll want several; scavenge from old board games in the meantime.</li>
        <li><strong>d4</strong> — daggers and magic missiles. Stepping on one is a rite of passage; store them point-down.</li>
        <li><strong>d% (percentile)</strong> — the tens-marker d10. Rolls d100 with its sibling for random tables and wild magic.</li>
      </ul>

      <h2>How many dice do you actually need?</h2>
      <p>Technically: one full set shared by the table. Practically: <strong>one set per player</strong> plus a communal pile of d6s. Rolling your own dice is half the tactile joy of the game, and sharing one d20 across five players is how arguments about lucky rolls start. The DM benefits most from extras — rolling 8d6 for a fireball one die at a time is a war crime against pacing.</p>

      <h2>What should your first set be?</h2>
      <p>A complete 7-piece set costs less than a pizza. Start with any set you'll recognize on a cluttered table — high-contrast numbers, a color nobody else at the table owns. If you want the one-purchase answer: a <a href="https://kylin-feng.github.io/dice-goblin-shop/products/metal-dice-bundle/" target="_blank" rel="noopener">metal set bundled with a folding tray</a> covers dice, rolling surface and storage in one box, and the weight genuinely changes how rolling feels. Prefer to start cheaper? A <a href="https://kylin-feng.github.io/dice-goblin-shop/products/resin-dice-set/" target="_blank" rel="noopener">sharp-edged resin set</a> looks premium at a third of the price. The full material comparison is in our <a href="../metal-vs-resin-dice/">metal vs resin dice guide</a>.</p>

      <h2>Rolling etiquette in sixty seconds</h2>
      <ul>
        <li>Roll in a tray or on a dice mat — bare tables dent (metal) and chips (sharp resin).</li>
        <li>Roll where everyone can see. Hidden rolls are the GM's privilege, not the players'.</li>
        <li>A die that falls off the table didn't count. Everyone knows this. It's fine.</li>
        <li>Cocking against a minis or pencil? Re-roll it, or your table's chosen tyrant decides forever.</li>
      </ul>

      <h2>Do you need specialty dice?</h2>
      <p>No. Advantage dice, hit-dice trackers and the thousand novelty shapes are fun, not required. The game runs on seven shapes and has for fifty years. Buy the oddities after you know which dice you actually reach for — most players discover they need more d6s and a better d20, in that order.</p>
    </div></div></section>`,
    faq: [
      ["How many dice do I need to start playing D&D?", "One 7-piece set per player is the comfortable minimum, plus a handful of extra d6s for damage rolls and hit points at the table."],
      ["What is the d20 used for in D&D?", "Attack rolls, ability checks and saving throws — the d20 decides success or failure for nearly every action in the game."],
      ["Can I play D&D with regular dice from other games?", "Yes — scavenged d6s plus any full set work fine; the shapes matter, the aesthetics don't."],
      ["What's the difference between the d10 and the percentile d%?", "The d% is a d10 marked in tens (00–90); rolled together with a normal d10 it produces 1–100 for random tables and wild magic."],
    ],
    crumbs: [["/", "Home"], [null, "Guides"]],
  },
  {
    slug: "guides/milestone-vs-xp-leveling",
    title: "Milestone vs XP Leveling in D&D 5e: Which Should You Use?",
    desc: "Milestone vs XP leveling in D&D 5e compared honestly: bookkeeping, player motivation, pacing control, session-zero implications and a hybrid most tables end up using.",
    h1: "Milestone vs XP Leveling",
    lead: "The first big rules decision most new DMs face, answered honestly: what each system rewards, what each one costs you, and the hybrid most tables end up using anyway.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <p>Every DM hits this choice in week two: track experience points, or level the party when it feels right? The internet treats this as a holy war; it's actually a trade-off with a boring, correct answer depending on your table.</p>

      <h2>What XP actually does</h2>
      <p>XP is a reward <em>signal</em>: kill monsters, complete quests, get stronger on a visible schedule. Players can see progress, plan their next level, and feel the meter filling. The published adventure books assume it. The costs are equally real: you'll do arithmetic every session, players optimize toward whatever earns XP (and combat earns most of it, which quietly discourages sneaking past the ogre), and a missed session or two leaves a player literally behind.</p>

      <h2>What milestone leveling actually does</h2>
      <p>Milestone (also called story-based) leveling puts the DM in charge: the party levels when the story says they should — after the arc's boss, before descending to the dungeon's second level. Benefits: zero bookkeeping, perfect pacing control, no incentive distortion (talking your way past the ogre earns exactly what killing it would). Costs: progress stops being visible, players lose the "almost there" feeling, and a DM who forgets to level the party for six sessions has a mutiny brewing that XP would have surfaced automatically.</p>

      <h2>The honest comparison</h2>
      <table>
        <tr><th></th><th>XP</th><th>Milestones</th></tr>
        <tr><td>Bookkeeping</td><td>Per-session tracking</td><td>None</td></tr>
        <tr><td>Reward visibility</td><td>High — a filling meter</td><td>Low — levels "happen"</td></tr>
        <tr><td>Pacing control</td><td>System-driven</td><td>DM-driven, total</td></tr>
        <tr><td>Rewards combat over stealth?</td><td>Quietly, yes</td><td>No</td></tr>
        <tr><td>Fits published adventures?</td><td>As written</td><td>Perfectly</td></tr>
        <tr><td>Skill floor</td><td>Low</td><td>Requires pacing judgment</td></tr>
      </table>

      <h2>Which should your table use?</h2>
      <p><strong>New DM:</strong> milestones, without hesitation — you're already juggling initiative, rules and plot; drop the spreadsheet. <strong>Sandbox campaign:</strong> XP — an open world needs a neutral progression engine the players can push against, and XP gives them a reason to pick dangerous fights. <strong>Published adventure:</strong> either works; milestones match the book's intended pacing with less work. <strong>Table full of optimizers:</strong> XP, so progression feels earned rather than scheduled — optimizers trust systems more than DMs.</p>

      <h2>The hybrid most tables converge on</h2>
      <p>Level by milestone, but <em>telegraph it</em>: "You'll hit level 4 after the cult is dealt with." Players get the almost-there feeling back without the arithmetic, and you keep full pacing control. Some tables add milestone side-awards — a level for a completed character arc, not just plot — which is where the system starts rewarding the actual point of the game.</p>

      <h2>Whatever you pick, write it down at session zero</h2>
      <p>Progression rules belong in the <a href="../session-zero-checklist/">session zero agreement</a> — switching systems mid-campaign after a player planned a build around level timing is how tables learn this lesson the hard way. And whichever system you run, the level-up night is a ceremony: new HP, new features, one round of "what can you do now?" Recap it on the <a href="../../session-notes-template/">session sheet</a> like everything else that matters.</p>
    </div></div></section>`,
    faq: [
      ["Is milestone or XP leveling better for new DMs?", "Milestones — they remove all progression bookkeeping while you're still learning combat and pacing, and they match published adventure pacing with zero effort."],
      ["Does XP leveling encourage murder-hoboing?", "It quietly rewards combat over avoidance since monsters carry the XP; milestone or hybrid systems fix that by rewarding solutions, not kills."],
      ["How often should a milestone table level up?", "Roughly every 2–4 sessions for levels 1–4, then slower; the best sign you've got it right is players saying 'we're about to level, right?' rather than asking why they haven't."],
      ["Can you switch from XP to milestones mid-campaign?", "Yes, cleanly — announce it, set the next milestone, and expect a smoother ride; switching the other direction mid-campaign is the messy one."],
    ],
    crumbs: [["/", "Home"], [null, "Guides"]],
  },
];

/* ---------------- misc pages ---------------- */

const miscPages = [
  {
    slug: "about",
    title: "About Printable DM",
    desc: "Who makes Printable DM: free, print-first tools for Dungeon Masters, designed around what real tables actually need mid-session.",
    h1: "About Printable DM",
    lead: "Print-first tools for Dungeon Masters, built around one idea: the best table reference is the one you can read in two seconds without unlocking anything.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <h2>Why print-first</h2>
      <p>Every sheet on this site exists because of a real moment at a real table: a skipped turn because HP was in someone's head, an argument about what Frightened does, a campaign that derailed because nobody wrote down the name of the merchant who knows where the vault is. Apps solve these problems too — until the battery dies or the laptop screen becomes a wall between the DM and the players.</p>
      <p>So we design paper. Good paper: layouts with margins that survive hole punches, columns wide enough for adult handwriting, contrast that survives a fifty-cent office printer.</p>
      <h2>The deal</h2>
      <ul>
        <li>Every PDF is free, for personal use at your table. Print copies for your whole group.</li>
        <li>No email wall, no account, no watermark, no &ldquo;premium&rdquo; version of the same sheet.</li>
        <li>Summaries follow the 5e SRD; the sheet is a memory aid, not a replacement for the rules.</li>
      </ul>
      <h2>Feedback shapes the toolkit</h2>
      <p>Want a fillable version, A5 sizing, Pathfinder variants, or a sheet that does not exist yet? <a href="../contact/">Tell us</a> — the roadmap is literally the request list.</p>
    </div></div></section>`,
    faq: [],
    crumbs: [["/", "Home"], [null, "About"]],
  },
  {
    slug: "contact",
    title: "Contact Printable DM",
    desc: "Report an issue, suggest a new printable, or tell us how you use the sheets at your table.",
    h1: "Contact",
    lead: "Requests, corrections, war stories — all welcome. The roadmap is the request list.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <h2>Request a printable</h2>
      <p>The fastest channel is the GitHub repository that hosts this project: open an issue with what you need (system, paper size, what the sheet must track) and it joins the roadmap.</p>
      <div class="dl-box">
        <div class="info">
          <strong>Open a request or report a problem</strong>
          <ul><li>Feature requests, PDF corrections, new systems</li></ul>
        </div>
        <a class="btn btn-gold" data-ext="github" href="https://github.com/kylin-feng/printable-dm/issues" target="_blank" rel="noopener">&#128279; GitHub Issues</a>
      </div>
      <h2>What we build first</h2>
      <ul>
        <li>Anything requested by multiple tables</li>
        <li>Sheets that fix a real mid-session failure (lost track, forgotten rule, skipped turn)</li>
        <li>Variants of existing sheets (A5, fillable, other d20 systems)</li>
      </ul>
    </div></div></section>`,
    faq: [],
    crumbs: [["/", "Home"], [null, "Contact"]],
  },
  {
    slug: "privacy",
    title: "Privacy Policy — Printable DM",
    desc: "Printable DM privacy policy: anonymous usage counts only, no cookies, no personal data, no third-party tracking.",
    h1: "Privacy Policy",
    lead: "Short version: we count page views anonymously and store nothing about you.",
    body: `
    <section class="block"><div class="wrap"><div class="article">
      <h2>What we collect</h2>
      <p>Anonymous, aggregated counts: which page was viewed, which site referred the visit, approximate browser language, and whether the browser is new to the site (a yes/no flag stored in your own browser's local storage). No IP addresses, no fingerprints, no personal data, no advertising identifiers.</p>
      <h2>Cookies</h2>
      <p>None. The unique-visitor check uses a single local storage key that never leaves your device.</p>
      <h2>Third parties</h2>
      <p>Downloads are served from GitHub Pages together with the site. We run no ads, no analytics platforms, and no social pixels.</p>
      <h2>Contact</h2>
      <p>Questions about this policy: <a href="../contact/">see the contact page</a>.</p>
    </div></div></section>`,
    faq: [],
    crumbs: [["/", "Home"], [null, "Privacy"]],
  },
];

/* ---------------- render everything ---------------- */

const allUrls = [];

function writePage(filePath, html, urlPath) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, html);
  allUrls.push(urlPath);
  console.log("wrote", filePath);
}

/* home */
writePage("index.html", layout({
  title: "Printable DM — Free Printable D&D 5e Tools for Dungeon Masters",
  desc: "Free printable D&D 5e tools: initiative tracker, DM screen cheat sheet, combat tracker, condition cards and session notes. Print-ready PDFs, no email required.",
  path: "/",
  crumbs: [],
  h1Block: "",
  bodyHTML: homeBody.replace(/href="(?!https?:|#)(guides|assets)/g, 'href="$1'),
}), "/");

/* products */
for (const p of productPages) {
  const base = "../";
  const pName = (PRODUCTS.find(x => x.slug === p.slug) || {}).name || "Tool";
  const relCards = p.related.map(slug => {
    const r = PRODUCTS.find(x => x.slug === slug);
    return `<article class="card"><div class="icon" aria-hidden="true">${r.icon}</div><h3><a href="../${r.slug}/">${r.name}</a></h3><p>${r.desc}</p></article>`;
  }).join("\n        ");
  const bodyHTML = `
    ${dlBox(base, p.pdf, pName, p.pdfBullets)}
    <section class="block"><div class="wrap"><div class="article">
      <h2>What's inside</h2>
      <ul>${p.inside.map(i => `<li>${i}</li>`).join("\n        ")}</ul>
      <h2>How to use it</h2>
      ${p.how}
      <div class="callout"><strong>Printing tip:</strong> ${p.printTip}</div>
      <h2>FAQ</h2>
      <div class="faq">
        ${p.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("\n        ")}
      </div>
    </div></div></section>
    <section class="block alt"><div class="wrap">
      <h2 class="section-title">Pairs well with</h2>
      <p class="section-sub">Sheets that solve the next problem down the chain.</p>
      <div class="card-grid">${relCards}</div>
    </div></section>`;

  writePage(`${p.slug}/index.html`, layout({
    base,
    title: p.title,
    desc: p.desc,
    path: `/${p.slug}/`,
    crumbs: [["/", "Home"], [null, p.name]],
    h1Block: pageHead([["../index.html", "Home"], [null, p.name]], p.h1, p.lead),
    bodyHTML,
    faq: p.faq,
  }), `/${p.slug}/`);
}

/* guides */
for (const g of guides) {
  writePage(`${g.slug}/index.html`, layout({
    base: "../../",
    title: g.title,
    desc: g.desc,
    path: `/${g.slug}/`,
    crumbs: g.crumbs,
    h1Block: pageHead([["../../index.html", "Home"], [null, g.h1]], g.h1, g.lead),
    bodyHTML: g.body,
    faq: g.faq,
  }), `/${g.slug}/`);
}

/* misc */
for (const m of miscPages) {
  writePage(`${m.slug}/index.html`, layout({
    base: "../",
    title: m.title,
    desc: m.desc,
    path: `/${m.slug}/`,
    crumbs: m.crumbs,
    h1Block: pageHead([["../index.html", "Home"], [null, m.h1]], m.h1, m.lead),
    bodyHTML: m.body,
    faq: m.faq,
  }), `/${m.slug}/`);
}

/* sitemap */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url><loc>${SITE}${u === "/" ? "/" : u}</loc><lastmod>${BUILT}</lastmod><changefreq>weekly</changefreq><priority>${u === "/" ? "1.0" : "0.8"}</priority></url>`).join("\n")}
</urlset>
`;
writeFileSync("sitemap.xml", sitemap);
console.log("wrote sitemap.xml");

/* robots */
writeFileSync("robots.txt", `User-agent: *
Allow: /
Disallow: /stats.html

Sitemap: ${SITE}/sitemap.xml
`);
console.log("wrote robots.txt");

/* indexnow key file */
writeFileSync(`${INDEXNOW_KEY}.txt`, INDEXNOW_KEY);
console.log("wrote indexnow key file");

console.log(`\nDone: ${allUrls.length} pages.`);
