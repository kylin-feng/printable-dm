/* make-pdfs.mjs — generates the five printable PDF products.
   Run: node tools/make-pdfs.mjs  (from repo root) → assets/downloads/*.pdf */
import PDFDocument from "pdfkit";
import { writeFileSync } from "node:fs";

const INK = "#2b2118", SOFT = "#5a4a38", RED = "#8b2f2f", GOLD = "#b98a3c",
      LINE = "#c9b98f", PAPER = "#fffdf6", HEAD = "#efe3c8", DARKBG = "#1a1410";

const OUT = "assets/downloads/";
const files = {};
const mk = (name, opts) => {
  const doc = new PDFDocument({ size: "LETTER", margin: 0, ...opts });
  const chunks = [];
  doc.on("data", c => chunks.push(c));
  doc.on("end", () => { files[name] = Buffer.concat(chunks); });
  return doc;
};
const saveAll = () => {
  for (const [name, buf] of Object.entries(files)) {
    writeFileSync(OUT + name, buf);
    console.log("wrote", OUT + name, (buf.length / 1024).toFixed(1) + " KB");
  }
};

/* ---------- shared drawing helpers ---------- */

function formHeader(doc, W, title, subtitle) {
  doc.save();
  doc.rect(0, 0, W, 54).fill(DARKBG);
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(10)
     .text("P R I N T A B L E   D M", 36, 12, { characterSpacing: 2 });
  doc.fillColor("#fdf8ea").font("Helvetica-Bold").fontSize(17).text(title, 36, 25);
  doc.fillColor("#9c8f74").font("Helvetica").fontSize(8)
     .text("printable-dm · free for your table · unofficial fan content, not affiliated with Wizards of the Coast", 36, 45);
  doc.restore();
  if (subtitle) {
    doc.fillColor(SOFT).font("Helvetica-Oblique").fontSize(9).text(subtitle, 36, 64);
  }
}

function formFooter(doc, W, H, pageLabel) {
  doc.fontSize(7.5).fillColor(SOFT).font("Helvetica");
  doc.text(pageLabel + " — Printable DM · kylin-feng.github.io/printable-dm", 36, H - 18, { width: W - 72, align: "center", lineBreak: false });
}

function box(doc, x, y, w, h, fill, stroke) {
  if (fill) doc.rect(x, y, w, h).fill(fill);
  if (stroke) doc.rect(x, y, w, h).stroke(stroke);
}

function gridTable(doc, x, y, w, cols, rows, rowH, headFill = HEAD) {
  const totalH = 26 + rows * rowH;
  doc.rect(x, y, w, totalH).lineWidth(1).stroke(INK);
  let cx = x;
  for (let i = 0; i < cols.length; i++) {
    if (i > 0) { doc.moveTo(cx, y).lineTo(cx, y + totalH).stroke(INK); }
    doc.rect(cx, y, cols[i].w, 26).fill(headFill);
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(8)
       .text(cols[i].label, cx + 4, y + 9, { width: cols[i].w - 8, align: cols[i].align || "left", characterSpacing: .5 });
    cx += cols[i].w;
  }
  for (let r = 1; r < rows; r++) {
    doc.moveTo(x, y + 26 + r * rowH).lineTo(x + w, y + 26 + r * rowH)
       .lineWidth(r % 5 === 0 ? 1.2 : .5).stroke(r % 5 === 0 ? INK : LINE);
  }
  return totalH;
}

function checkBoxes(doc, x, y, n, size, gap, labels) {
  for (let i = 0; i < n; i++) {
    doc.rect(x + i * (size + gap), y, size, size).lineWidth(.8).stroke(INK);
    if (labels) doc.font("Helvetica").fontSize(6).fillColor(SOFT)
      .text(labels[i], x + i * (size + gap), y + size + 2, { width: size + gap, align: "center" });
  }
}

function pip(doc, x, y, r) { doc.circle(x, y, r).lineWidth(.7).stroke(INK); }

function sectionTitle(doc, x, y, w, text) {
  doc.rect(x, y, w, 18).fill(HEAD);
  doc.fillColor(RED).font("Helvetica-Bold").fontSize(9.5)
     .text(text.toUpperCase(), x + 6, y + 5, { characterSpacing: 1 });
}

/* =========================================================
   1) INITIATIVE TRACKER — 2 pages landscape
   ========================================================= */
function initiativeTracker() {
  const doc = mk("initiative-tracker.pdf", { layout: "landscape" });
  const W = 792, H = 612, M = 36;
  formHeader(doc, W, "Initiative Tracker — D&D 5e", "Write combatants in initiative order before round one. Ties: higher Dexterity goes first.");

  /* main roster */
  const rosterY = 84;
  const cols = [
    { label: "INIT", w: 46, align: "center" },
    { label: "NAME", w: 200 },
    { label: "AC", w: 40, align: "center" },
    { label: "HP MAX", w: 56, align: "center" },
    { label: "HP / DAMAGE TALLY", w: 150, align: "center" },
    { label: "NOTES — concentration · marks · morale", w: 268 },
  ];
  const rowH = 19;
  gridTable(doc, M, rosterY, W - M * 2, cols, 22, rowH);

  /* round strip — tick boxes with the round number printed inside */
  const stripY = rosterY + 26 + 22 * rowH + 12;
  sectionTitle(doc, M, stripY, W - M * 2, "Round counter — tick one box each time the order wraps to the top");
  const boxesY = stripY + 24;
  const n = 20, bw = 26, gap = ((W - M * 2) - n * bw) / (n - 1);
  for (let i = 0; i < n; i++) {
    const bx = M + i * (bw + gap);
    doc.rect(bx, boxesY, bw, 22).lineWidth(.8).stroke(INK);
    doc.font("Helvetica").fontSize(8).fillColor(SOFT)
       .text(String(i + 1), bx, boxesY + 7, { width: bw, align: "center", lineBreak: false });
  }

  formFooter(doc, W, H, "Page 1 of 2 — roster + round strip");

  /* page 2: quick reference + extra notes */
  doc.addPage({ size: "LETTER", layout: "landscape", margin: 0 });
  formHeader(doc, W, "Initiative Tracker — Quick Reference & Extra Notes");

  const colW = (W - M * 2 - 20) / 2;
  const y0 = 84;

  sectionTitle(doc, M, y0, colW, "Quick reference");
  doc.font("Helvetica").fontSize(9).fillColor(INK);
  const qr = [
    ["Tie-break:", "higher Dexterity modifier acts first; still tied — roll off (common house rule: PCs beat monsters)."],
    ["Surprise:", "not a round — surprised creatures lose their first turn's actions/reactions; then act normally."],
    ["Grouping:", "identical monsters share one roll and one turn (roll once per type, not per monster)."],
    ["Lair actions:", "act at initiative count 20, losing ties — write \u201CLAIR — 20\u201D into the roster like a combatant."],
    ["Ready:", "declare action + trigger; when trigger fires, resolve immediately (your reaction); lasts until your next turn."],
    ["Delay (house):", "5e has no delay — swap initiative or hold action instead; mark D in the notes column."],
    ["Concentration:", "damage on the caster forces a Con save, DC 10 or half damage taken (whichever is higher)."],
    ["Rounds:", "1 minute = 10 rounds; most spell durations count down as the round counter wraps."],
  ];
  let ty = y0 + 28;
  for (const [k, v] of qr) {
    doc.font("Helvetica-Bold").text(k, M + 4, ty, { width: 108 });
    doc.font("Helvetica").text(v, M + 116, ty, { width: colW - 120 });
    ty += doc.heightOfString(v, { width: colW - 120 }) + 9;
  }

  sectionTitle(doc, M + colW + 20, y0, colW, "Extra notes / cliffhanger");
  box(doc, M + colW + 20, y0 + 18, colW, 380, null, INK);
  for (let i = 1; i < 14; i++) {
    doc.moveTo(M + colW + 20, y0 + 18 + i * 27).lineTo(M + colW + 20 + colW, y0 + 18 + i * 27)
       .lineWidth(.5).stroke(LINE);
  }

  formFooter(doc, W, H, "Page 2 of 2 — reference + notes");
  doc.end();
}

/* =========================================================
   2) DM SCREEN CHEAT SHEET — 4 pages portrait
   ========================================================= */
const CONDITIONS = [
  ["Blinded", "Can't see; auto-fails checks that need sight. Attacks against it have advantage; its attacks have disadvantage.", "Ends when the cause is removed."],
  ["Charmed", "Can't attack the charmer; charmer has advantage on social ability checks with it.", "Ends when the cause is removed."],
  ["Deafened", "Can't hear; auto-fails checks that need hearing.", "Ends when the cause is removed."],
  ["Frightened", "Disadvantage on checks and attacks while the source is in sight; can't willingly move closer to it.", "Ends when the cause is removed or the save is made."],
  ["Grappled", "Speed becomes 0 (inherits grappler's speed if moved).", "Ends if grappler is incapacitated, effect ends, or you're teleported away."],
  ["Incapacitated", "Can't take actions or reactions.", "Ends when the cause is removed."],
  ["Invisible", "Can't be seen without magic; attacks against it have disadvantage, its attacks have advantage.", "Ends when the cause is removed."],
  ["Paralyzed", "Incapacitated, can't move or speak, auto-fails Str/Dex saves. Attacks from within 5 ft have advantage and auto-crit.", "Ends when the cause is removed or save is made."],
  ["Petrified", "Turned to stone: incapacitated, resistant to all damage, immune to poison/disease, auto-fails Str/Dex saves.", "Ends when the cause is removed."],
  ["Poisoned", "Disadvantage on attack rolls and ability checks.", "Ends when the cause is removed or save is made."],
  ["Prone", "Only crawl or stand (half speed). Melee attacks against it have advantage, ranged have disadvantage; its own attacks have disadvantage.", "Stands up: half its movement."],
  ["Restrained", "Speed 0; attacks against it have advantage, its attacks have disadvantage; disadvantage on Dex saves.", "Ends when the cause is removed."],
  ["Stunned", "Incapacitated, can't move, auto-fails Str/Dex saves, only falteringly speaks; attacks against it have advantage.", "Ends when the cause is removed or save is made."],
  ["Unconscious", "Incapacitated, prone, unaware, drops what it holds, auto-fails Str/Dex saves; melee hits within 5 ft auto-crit.", "Regains HP, or is shaken awake as an action."],
  ["Exhaustion (6 lvls)", "1: dis-adv on ability checks · 2: speed halved · 3: dis-adv on attacks & saves · 4: HP max halved · 5: speed 0 · 6: death.", "Long rest + food & drink removes 1 level; greater restoration (5th+) removes all."],
];

function dmScreen() {
  const doc = mk("dm-screen-cheat-sheet.pdf", { layout: "portrait" });
  const W = 612, H = 792, M = 36, CW = W - M * 2;

  const blocks = [
    {
      title: "Combat flow & action economy",
      rows: [
        ["YOUR TURN", "Move up to your speed + one Action + one Bonus Action (only if a feature grants it) + one free object interaction."],
        ["REACTIONS", "Any time, once per round (opportunity attack, counterspell, shield, ready trigger…)."],
        ["ATTACK ROLL", "d20 + ability mod + proficiency vs target AC. Natural 20: auto-hit, double the dice. Natural 1: auto-miss."],
        ["SPELL SAVE DC", "8 + proficiency bonus + spellcasting ability modifier."],
        ["OPPORTUNITY ATTACK", "Triggered when a hostile leaves your reach (not on Disengage, not teleportation, not forced movement). One melee attack as a reaction."],
        ["TWO-WEAPON FIGHTING", "Bonus action attack with the other light weapon; no ability mod to damage unless a feature adds it."],
        ["GRAPPLE / SHOVE", "Athletics contest vs target's Athletics or Acrobatics (their choice). Shove: 5 ft away or prone."],
        ["COVER", "Half cover +2 AC & Dex saves · three-quarters +5 · total: can't be targeted directly."],
      ],
    },
    {
      title: "Dying & death saves",
      rows: [
        ["AT 0 HP", "Unconscious. At the start of each of your turns: roll a death save, DC 10."],
        ["3 SUCCESSES", "Stable but unconscious (regain 1 HP after 1d4 hours)."],
        ["3 FAILURES", "Dead."],
        ["DAMAGE AT 0 HP", "Automatic failure; a critical hit = two failures."],
        ["NATURAL 20", "Regain 1 hit point."],
        ["NATURAL 1", "Two failures."],
        ["STABILIZE (Medicine)", "DC 10 Wisdom (Medicine) as an action; or any healing restores consciousness."],
      ],
    },
    {
      title: "Common DCs & ability checks",
      rows: [
        ["VERY EASY 5", "Notice something in plain sight."],
        ["EASY 10", "Climb a knotted rope · hear a conversation through a door."],
        ["MEDIUM 15", "Pick a lock · calm a spooked animal · swim in rough water."],
        ["HARD 20", "Swim against a current · pick a well-made lock · resist a banshee's wail."],
        ["VERY HARD 25", "Disarm a complex trap · win a riddle contest with a sphinx."],
        ["NEARLY IMPOSSIBLE 30", "Track a squad of orcs across bare rock after 3 days of rain."],
        ["PASSIVE CHECKS", "10 + modifier (+5 advantage / −5 disadvantage). Passive Perception vs stealth."],
        ["HELP", "An ally helps: the helped creature gains advantage on the check (needs to be able to attempt it)."],
      ],
    },
    {
      title: "Concentration & common snags",
      rows: [
        ["CONCENTRATION SAVE", "DC 10 or half the damage taken, whichever is higher. Fail = spell ends."],
        ["WHAT BREAKS IT", "Casting another concentration spell, being incapacitated, dying, or the DM-call: environmental extremes."],
        ["ADVANTAGE / DISADVANTAGE", "Don't stack; multiple sources = still just one of each. They cancel."],
        ["READY", "Declare action + trigger; when trigger fires, resolve immediately (reaction). Held spell: concentration required."],
        ["MOVEMENT IN COMBAT", "Can split movement around actions; standing from prone costs half speed; difficult terrain costs extra."],
        ["DROPPING TO 0", "Transformed / polymorphed creatures revert; temporary HP can't raise you from 0."],
        ["HIDDEN ATTACKER", "Unseen attacker: advantage on attacks; targets that can't see you can't react to your movement."],
        ["SURPRISE", "Compare group Stealth vs Passive Perception; surprised creatures skip actions/reactions on their first turn only."],
      ],
    },
  ];

  /* page 1 + 3 + 4 = key-value blocks, page 2 = conditions table */
  const layoutKv = (blk, pageNo, pageOf) => {
    formHeader(doc, W, "DM Screen — " + blk.title, "Rules you look up mid-fight, written as rulings.");
    let y = 84;
    const rowH = Math.min(72, (H - 130 - y) / blk.rows.length);
    for (const [k, v] of blk.rows) {
      const h = Math.max(46, rowH - 6);
      box(doc, M, y, CW, h, null, LINE);
      doc.rect(M, y, 148, h).fill(HEAD);
      doc.fillColor(RED).font("Helvetica-Bold").fontSize(8.5)
         .text(k, M + 8, y + 8, { width: 132 });
      doc.fillColor(INK).font("Helvetica").fontSize(9.5)
         .text(v, M + 160, y + 8, { width: CW - 168, lineGap: 2 });
      y += h + 6;
    }
    formFooter(doc, W, H, `Insert ${pageNo} of ${pageOf}`);
  };

  layoutKv(blocks[0], 1, 5);
  doc.addPage({ size: "LETTER", layout: "portrait", margin: 0 });
  formHeader(doc, W, "DM Screen — All 15 Conditions", "One line of effect, one line of what ends it.");

  /* conditions as 2-col card grid, 8 cards per page across 2 pages */
  const cardW = (CW - 12) / 2, cardH = 128, perPage = 8;
  CONDITIONS.forEach((c, i) => {
    const idx = i % perPage;
    if (i > 0 && idx === 0) {
      formFooter(doc, W, H, "Insert 2 of 5");
      doc.addPage({ size: "LETTER", layout: "portrait", margin: 0 });
      formHeader(doc, W, "DM Screen — All 15 Conditions (cont.)", "One line of effect, one line of what ends it.");
    }
    const col = idx % 2, row = Math.floor(idx / 2);
    const x = M + col * (cardW + 12), cy = 84 + row * (cardH + 8);
    box(doc, x, cy, cardW, cardH, null, INK);
    doc.rect(x, cy, cardW, 22).fill(RED);
    doc.fillColor("#fdf8ea").font("Helvetica-Bold").fontSize(10).text(c[0], x + 8, cy + 6);
    doc.fillColor(INK).font("Helvetica").fontSize(8.6).text(c[1], x + 8, cy + 28, { width: cardW - 16, lineGap: 1.5 });
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(SOFT).text(c[2], x + 8, cy + cardH - 22, { width: cardW - 16 });
  });
  formFooter(doc, W, H, "Insert 3 of 5");

  doc.addPage({ size: "LETTER", layout: "portrait", margin: 0 });
  layoutKv(blocks[2], 4, 5);
  doc.addPage({ size: "LETTER", layout: "portrait", margin: 0 });
  layoutKv(blocks[3], 5, 5);
  doc.end();
}

/* =========================================================
   3) COMBAT TRACKER — 2 pages landscape, 8 blocks
   ========================================================= */
function combatTracker() {
  const doc = mk("combat-tracker.pdf", { layout: "landscape" });
  const W = 792, H = 612, M = 36;

  const drawBlock = (x, y, w, h, n) => {
    box(doc, x, y, w, h, null, INK);
    doc.rect(x, y, w, 24).fill(HEAD);
    doc.fillColor(SOFT).font("Helvetica-Bold").fontSize(8).text("COMBATANT #" + n, x + 8, y + 8);
    /* init / ac / name fields */
    doc.fillColor(SOFT).font("Helvetica-Bold").fontSize(7);
    doc.text("INIT", x + w - 210, y + 7); doc.text("AC", x + w - 130, y + 7); doc.text("HP MAX", x + w - 80, y + 7);
    for (const [fx, fw] of [[x + w - 178, 42], [x + w - 108, 22], [x + w - 42, 42]]) box(doc, fx, y + 24, fw, 18, null, LINE);
    box(doc, x + 110, y + 24, w - 300, 18, null, LINE);
    doc.rect(x, y + 24, 110, 18).fill(PAPER);
    /* HP pips: 2 rows of 15 */
    doc.fillColor(SOFT).font("Helvetica-Bold").fontSize(7).text("HP PIPS — shade one per HP (or per 5 HP for big monsters)", x + 8, y + 47);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 15; i++) {
      const px = x + 8 + 16 + i * ((w - 40) / 15), py = y + 62 + r * 18;
      pip(doc, px, py + 4, 5.5);
    }
    /* marks row */
    const marks = ["CONC", "BLESS", "POISONED", "BLOODIED", "MARK"];
    let mx = x + 8;
    doc.fillColor(SOFT).font("Helvetica-Bold").fontSize(7).text("STATE", mx, y + 102);
    mx += 44;
    for (const m of marks) {
      doc.rect(mx, y + 98, 11, 11).lineWidth(.8).stroke(INK);
      doc.font("Helvetica").fontSize(7).fillColor(SOFT).text(m, mx + 15, y + 99);
      mx += 15 + doc.widthOfString(m) + 14;
    }
    /* notes lines */
    for (let i = 0; i < 2; i++)
      doc.moveTo(x + 8, y + h - 14 - i * 20).lineTo(x + w - 8, y + h - 14 - i * 20).lineWidth(.5).stroke(LINE);
  };

  formHeader(doc, W, "Combat Tracker — up to 4 combatants per sheet", "Pre-fill pips to HP max, cross off from the right. Marks row: concentration, buffs, bloodied.");
  const bw2 = (W - M * 2 - 14) / 2, bh = 158;
  drawBlock(M, 84, bw2, bh, 1); drawBlock(M + bw2 + 14, 84, bw2, bh, 2);
  drawBlock(M, 84 + bh + 10, bw2, bh, 3); drawBlock(M + bw2 + 14, 84 + bh + 10, bw2, bh, 4);
  formFooter(doc, W, H, "Page 1 of 2 — combatants 1–4");

  doc.addPage({ size: "LETTER", layout: "landscape", margin: 0 });
  formHeader(doc, W, "Combat Tracker — combatants 5–8 + fight notes");
  drawBlock(M, 84, bw2, bh, 5); drawBlock(M + bw2 + 14, 84, bw2, bh, 6);
  drawBlock(M, 84 + bh + 10, bw2, bh, 7); drawBlock(M + bw2 + 14, 84 + bh + 10, bw2, bh, 8);

  const ny = 84 + 2 * bh + 24;
  sectionTitle(doc, M, ny, W - M * 2, "Fight notes — lair actions (init 20) · legendary budget · environment");
  box(doc, M, ny + 18, W - M * 2, H - ny - 60, null, INK);
  for (let i = 1; i < 4; i++)
    doc.moveTo(M, ny + 18 + i * 24).lineTo(W - M, ny + 18 + i * 24).lineWidth(.5).stroke(LINE);

  formFooter(doc, W, H, "Page 2 of 2 — combatants 5–8 + notes");
  doc.end();
}

/* =========================================================
   4) CONDITION CARDS — 2 pages portrait, 16 die-cut cards
   ========================================================= */
function conditionCards() {
  const doc = mk("condition-cards.pdf", { layout: "portrait" });
  const W = 612, H = 792, M = 30;
  const cardW = (W - M * 2 - 10) / 2, cardH = 116, rows = Math.floor((H - 90) / (cardH + 8));
  formHeader(doc, W, "Condition Cards — cut & clip to your screen", "Print on cardstock (65–80 lb), cut along dashed lines, fold the top band over your screen edge.");

  const all = [...CONDITIONS, ["How to use", "When a condition lands on a character, hand them the card — they read it, they own it, you never re-explain frightened again.", "Printable DM · free for your table."]];
  all.forEach((c, i) => {
    const page = Math.floor(i / (rows * 2));
    const idx = i % (rows * 2);
    const col = idx % 2, row = Math.floor(idx / 2);
    if (i > 0 && idx === 0) doc.addPage({ size: "LETTER", layout: "portrait", margin: 0 });
    const x = M + col * (cardW + 10), y = 84 + row * (cardH + 8);
    /* dashed border */
    doc.save();
    doc.rect(x, y, cardW, cardH).dash(3, { space: 3 }).lineWidth(1).stroke(SOFT);
    doc.restore();
    /* fold band */
    doc.save();
    doc.rect(x, y, cardW, 16).fill(HEAD);
    doc.restore();
    doc.moveTo(x, y + 16).lineTo(x + cardW, y + 16).lineWidth(.7).stroke(SOFT);
    doc.fillColor(SOFT).font("Helvetica").fontSize(6).text("▾ fold over screen ▾", x, y + 5, { width: cardW, align: "center" });
    doc.fillColor(RED).font("Helvetica-Bold").fontSize(13).text(c[0], x + 8, y + 22);
    doc.fillColor(INK).font("Helvetica").fontSize(8.8).text(c[1], x + 8, y + 40, { width: cardW - 16, lineGap: 1.6 });
    doc.font("Helvetica-Oblique").fontSize(7.6).fillColor(SOFT)
       .text(c[2], x + 8, y + cardH - 18, { width: cardW - 16 });
  });
  doc.end();
}

/* =========================================================
   5) SESSION NOTES — 2 pages landscape
   ========================================================= */
function sessionNotes() {
  const doc = mk("session-notes.pdf", { layout: "landscape" });
  const W = 792, H = 612, M = 36;

  formHeader(doc, W, "Session Notes — recap sheet", "Fill it in during the last 15 minutes, while players recap out loud. What they remember is what happened.");

  /* header fields */
  const fields = [["SESSION #", 90], ["IN-GAME DATE", 130], ["REAL DATE", 120], ["PARTY LEVEL", 100], ["WHO SHOWED UP", ""]];
  let fx = M; const fy = 78; const fh = 34;
  const totalW = W - M * 2;
  const fixed = fields.reduce((a, f) => a + (typeof f[1] === "number" ? f[1] : 0), 0);
  const flex = fields.find(f => f[1] === "");
  const flexW = totalW - fixed - 20 * (fields.length - 1);
  for (const f of fields) {
    const fw = f === flex ? flexW : f[1];
    box(doc, fx, fy, fw, fh, null, INK);
    doc.fillColor(SOFT).font("Helvetica-Bold").fontSize(6.5).text(f[0], fx + 5, fy + 4);
    fx += fw + 20;
  }

  /* party status */
  const py = fy + fh + 14;
  sectionTitle(doc, M, py, W - M * 2, "Party status — carry these numbers into next session");
  const pcols = [
    { label: "CHARACTER", w: 170 }, { label: "PLAYER", w: 120 },
    { label: "HP / CONDITIONS", w: 170, align: "center" },
    { label: "INSPIRATION", w: 80, align: "center" }, { label: "GOLD Δ", w: 80, align: "center" },
    { label: "XP / MILESTONE NOTES", w: 280 },
  ];
  const pH = gridTable(doc, M, py + 18, W - M * 2, pcols, 6, 22);

  /* NPCs */
  const ny = py + 18 + pH + 14;
  sectionTitle(doc, M, ny, W - M * 2, "NPCs met & names dropped — name · first impression · what they want");
  box(doc, M, ny + 18, W - M * 2, H - 118 - (ny + 18), null, INK);
  for (let i = 1; i < 4; i++)
    doc.moveTo(M, ny + 18 + i * 30).lineTo(W - M, ny + 18 + i * 30).lineWidth(.5).stroke(LINE);
  doc.moveTo(M + (W - M * 2) * .38, ny + 18).lineTo(M + (W - M * 2) * .38, H - 100).lineWidth(.5).stroke(LINE);

  formFooter(doc, W, H, "Page 1 of 2 — status & NPCs");

  doc.addPage({ size: "LETTER", layout: "landscape", margin: 0 });
  formHeader(doc, W, "Session Notes — loot, secrets & hooks");

  const cW = (W - M * 2 - 16) / 3;
  const y0 = 84;

  sectionTitle(doc, M, y0, cW, "Loot handed out");
  box(doc, M, y0 + 18, cW, 300, null, INK);
  for (let i = 1; i < 9; i++) doc.moveTo(M + 6, y0 + 18 + i * 33).lineTo(M + cW - 6, y0 + 18 + i * 33).lineWidth(.5).stroke(LINE);

  sectionTitle(doc, M + cW + 16, y0, cW, "Secrets revealed / promises made");
  box(doc, M + cW + 16, y0 + 18, cW, 300, null, INK);
  for (let i = 1; i < 9; i++) doc.moveTo(M + cW + 22, y0 + 18 + i * 33).lineTo(M + cW * 2 + 10, y0 + 18 + i * 33).lineWidth(.5).stroke(LINE);

  sectionTitle(doc, M + (cW + 16) * 2, y0, cW, "Open threads");
  box(doc, M + (cW + 16) * 2, y0 + 18, cW, 300, null, INK);
  for (let i = 1; i < 9; i++) doc.moveTo(M + (cW + 16) * 2 + 6, y0 + 18 + i * 33).lineTo(M + (cW + 16) * 2 + cW - 6, y0 + 18 + i * 33).lineWidth(.5).stroke(LINE);

  const hy = y0 + 18 + 300 + 16;
  sectionTitle(doc, M, hy, W - M * 2, "Next session — cold open: read these three hooks aloud");
  const hookW = (W - M * 2 - 32) / 3;
  for (let i = 0; i < 3; i++) {
    const hx = M + i * (hookW + 16);
    box(doc, hx, hy + 18, hookW, 90, null, RED);
    doc.fillColor(SOFT).font("Helvetica-Bold").fontSize(7.5).text("HOOK " + (i + 1), hx + 6, hy + 24);
  }

  formFooter(doc, W, H, "Page 2 of 2 — loot, secrets & hooks");
  doc.end();
}

/* run all */
initiativeTracker();
dmScreen();
combatTracker();
conditionCards();
sessionNotes();
setTimeout(saveAll, 1500);
