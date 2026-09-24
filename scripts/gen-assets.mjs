// Generates the SVG assets for the AnotherAH profile README.
// Run: node scripts/gen-assets.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "assets");
const BRAND = join(import.meta.dirname, "..", "brand");

// The Skyver Labs mark (Scorpius traced as an S), read from the official icon
// so the profile always matches the brand files. Coordinates are centred on 0,0.
const iconSvg = readFileSync(join(BRAND, "skyver-icon-gold-transparent.svg"), "utf8");
const MARK = {
  points: iconSvg.match(/<polyline points="([^"]+)"/)[1].split(" ").map((p) => p.split(",").map(Number)),
  stars: [...iconSvg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)" fill="(#[0-9A-Fa-f]+)"( fill-opacity)?/g)]
    .filter((m) => !m[5])
    .map((m) => ({ x: +m[1], y: +m[2], r: +m[3], fill: m[4] })),
};
const ANTARES = MARK.stars.find((s) => s.fill.toUpperCase() === "#E8843A");

// The official horizontal lockup (mark + outlined "skyver labs" wordmark).
const lockupSvg = readFileSync(join(BRAND, "skyver-lockup-horizontal-gold-transparent.svg"), "utf8");
const LOCKUP = {
  w: +lockupSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)[1],
  h: +lockupSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)[2],
  inner: lockupSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, ""),
};
const lockup = (x, y, height) => `<g transform="translate(${x},${y}) scale(${(height / LOCKUP.h).toFixed(4)})">${LOCKUP.inner}</g>`;

// A static copy of the mark, centred on cx,cy, `height` px tall.
function mark(cx, cy, height) {
  const s = height / 86;
  return `<g transform="translate(${cx},${cy}) scale(${s.toFixed(4)})"><polyline points="${MARK.points.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${"#F0B44A"}" stroke-opacity=".35" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>${MARK.stars.map((st) => (st === ANTARES ? `<circle cx="${st.x}" cy="${st.y}" r="8.8" fill="#E8843A" fill-opacity=".22"/>` : "") + `<circle cx="${st.x}" cy="${st.y}" r="${st.r}" fill="${st.fill}"/>`).join("")}</g>`;
}

const C = {
  navy: "#141B3A", navy2: "#10162e", panel: "#1a2246", line: "#2a3363", line2: "#3a4478",
  white: "#F5F3EC", muted: "#9aa0c4", faint: "#6a7099",
  gold: "#F0B44A", goldSoft: "#F3D08A", antares: "#E8843A",
};
const SANS = `Manrope, 'Segoe UI', Ubuntu, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const MONO = `'JetBrains Mono', 'Cascadia Code', Consolas, 'DejaVu Sans Mono', Menlo, monospace`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Deterministic PRNG so the starfield is stable between runs.
let seed = 20200906;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

function starfield(w, h, n, avoid = () => false) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = +(rnd() * w).toFixed(1), y = +(rnd() * h).toFixed(1);
    if (avoid(x, y)) { i--; continue; }
    const r = +(0.6 + rnd() * 1.1).toFixed(2);
    const fill = rnd() < 0.3 ? C.goldSoft : C.white;
    const dur = (2.5 + rnd() * 4).toFixed(2), delay = (-rnd() * 6).toFixed(2);
    out += `<circle class="tw" cx="${x}" cy="${y}" r="${r}" fill="${fill}" style="animation-duration:${dur}s;animation-delay:${delay}s"/>`;
  }
  return out;
}

// ---------------------------------------------------------------- banner
function banner() {
  const W = 1200, H = 320;

  // The Skyver mark, large, on the right side of the banner.
  const MX = 1030, MY = 160, MS = 2.75;
  const at = (x, y) => [+(MX + x * MS).toFixed(1), +(MY + y * MS).toFixed(1)];
  const lines = [MARK.points.map(([x, y]) => at(x, y).join(",")).join(" ")];
  const stars = MARK.stars.filter((st) => st !== ANTARES).map((st, i) => {
    const [x, y] = at(st.x, st.y);
    return `<circle cx="${x}" cy="${y}" r="${(st.r * 1.5).toFixed(2)}" fill="${st.fill}" class="cs" style="animation-delay:${(0.4 + i * 0.12).toFixed(2)}s"/>`;
  }).join("");
  const alpha = at(ANTARES.x, ANTARES.y);
  const S = { alpha };

  // Typing line.
  const phrases = [
    "keeping Linux servers boring & reliable",
    "building web, UI/UX and software",
    "turning any video into a transcript",
    "self-hosting everything I can",
  ];
  const CW = 12, X0 = 100, Y0 = 250, SLOT = 4.2, T = SLOT * phrases.length;
  const TYPE = 0.055, BACK = 0.018, HOLD_END = 3.2;
  const kt = (t) => (t / T).toFixed(5);

  const cursorPts = []; // [time, x]
  let typing = "", clips = "";
  phrases.forEach((p, i) => {
    const n = p.length, t0 = i * SLOT, pts = [[0, 0]];
    pts.push([t0, 0]);
    for (let c = 1; c <= n; c++) pts.push([t0 + c * TYPE, c * CW]);
    const eraseAt = t0 + HOLD_END;
    for (let c = n - 1; c >= 0; c--) pts.push([eraseAt + (n - c) * BACK, c * CW]);
    pts.push([T, 0]);
    // collapse to strictly usable lists
    const times = pts.map((q) => kt(q[0])).join(";"), vals = pts.map((q) => q[1]).join(";");
    clips += `<clipPath id="p${i}"><rect x="${X0}" y="${Y0 - 24}" height="34" width="0"><animate attributeName="width" dur="${T}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times}" values="${vals}"/></rect></clipPath>`;
    typing += `<text x="${X0}" y="${Y0}" clip-path="url(#p${i})" textLength="${n * CW}" lengthAdjust="spacingAndGlyphs" class="type">${esc(p)}</text>`;
    pts.slice(1, -1).forEach(([t, w]) => cursorPts.push([t, X0 + w + 3]));
  });
  cursorPts.unshift([0, X0 + 3]);
  cursorPts.push([T, X0 + 3]);
  const cursor = `<rect y="${Y0 - 19}" width="11" height="23" rx="1.5" fill="${C.gold}" class="blink"><animate attributeName="x" dur="${T}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${cursorPts.map((q) => kt(q[0])).join(";")}" values="${cursorPts.map((q) => q[1]).join(";")}"/></rect>`;

  const avoidText = (x, y) => (x < 760 && y > 50 && y < 275) || (x > 950 && x < 1110 && y > 30 && y < 290 && rnd() < 0.7);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">Hey, I'm AH</title>
<desc id="d">Linux engineer building Skyver Labs, based in Canada.</desc>
<defs>
  <radialGradient id="sky" cx="72%" cy="-10%" r="95%"><stop offset="0" stop-color="#24306a"/><stop offset=".55" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.navy2}"/></radialGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="${C.antares}" stop-opacity=".75"/><stop offset=".35" stop-color="${C.antares}" stop-opacity=".22"/><stop offset="1" stop-color="${C.antares}" stop-opacity="0"/></radialGradient>
  <linearGradient id="rule" x1="0" x2="1"><stop offset="0" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></linearGradient>
  <clipPath id="card"><rect width="${W}" height="${H}" rx="22"/></clipPath>
  ${clips}
</defs>
<style>
  .tw{animation:tw ease-in-out infinite alternate}
  @keyframes tw{from{opacity:.15}to{opacity:.95}}
  .cl{fill:none;stroke:${C.gold};stroke-opacity:.45;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:draw 2.6s .3s cubic-bezier(.4,0,.2,1) forwards}
  @keyframes draw{to{stroke-dashoffset:0}}
  .cs{opacity:0;animation:pop .5s ease-out forwards}
  @keyframes pop{to{opacity:1}}
  .ant{transform-origin:${S.alpha[0]}px ${S.alpha[1]}px;animation:pulse 3.2s ease-in-out infinite}
  @keyframes pulse{0%,100%{transform:scale(.85);opacity:.75}50%{transform:scale(1.15);opacity:1}}
  .up{opacity:0;animation:up .8s cubic-bezier(.2,.7,.2,1) forwards}
  @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .type{font:500 20px ${MONO};fill:${C.white}}
  .blink{animation:blink 1s steps(1) infinite}
  @keyframes blink{50%{opacity:0}}
  @media (prefers-reduced-motion:reduce){.tw,.cl,.cs,.ant,.up{animation:none;opacity:1;stroke-dashoffset:0}}
</style>
<g clip-path="url(#card)">
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${starfield(W, H, 70, avoidText)}
  <circle cx="${S.alpha[0]}" cy="${S.alpha[1]}" r="46" fill="url(#glow)" class="ant"/>
  ${lines.map((l) => `<polyline class="cl" pathLength="1" points="${l}"/>`).join("")}
  ${stars}
  <circle cx="${S.alpha[0]}" cy="${S.alpha[1]}" r="7" fill="${C.antares}"/>
  <text x="${S.alpha[0] + 20}" y="${S.alpha[1] + 5}" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${C.antares}" opacity=".8" class="up" style="animation-delay:2.4s">ANTARES</text>
</g>
<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="21.5" fill="none" stroke="${C.line2}" stroke-width="1.5"/>
<g class="up" style="animation-delay:.1s"><text x="72" y="84" font-family="${MONO}" font-size="17" fill="${C.goldSoft}"><tspan fill="${C.faint}">~/skyver-labs</tspan> $ whoami</text></g>
<g class="up" style="animation-delay:.3s"><text x="68" y="152" font-family="${SANS}" font-size="64" font-weight="800" letter-spacing="-1.5" fill="${C.white}">Hey, I’m AH<tspan fill="${C.gold}">.</tspan></text></g>
<g class="up" style="animation-delay:.5s"><text x="72" y="194" font-family="${SANS}" font-size="22" font-weight="500" fill="${C.muted}">Linux engineer <tspan fill="${C.gold}">·</tspan> building Skyver Labs <tspan fill="${C.gold}">·</tspan> Canada</text>
<rect x="72" y="212" width="260" height="2" fill="url(#rule)" rx="1"/></g>
<g class="up" style="animation-delay:.7s">
  <text x="72" y="${Y0}" font-family="${MONO}" font-size="20" font-weight="700" fill="${C.gold}">&gt;</text>
  ${typing}
  ${cursor}
</g>
</svg>
`;
}

// ---------------------------------------------------------------- cards
function card({ tag, title, lines, chips, link, W = 600, art, wip }) {
  const H = 230;
  let cx = 32;
  const chipSvg = chips.map((c) => {
    const w = Math.round(c.length * 8.4 + 24);
    const s = `<rect x="${cx}" y="170" width="${w}" height="30" rx="15" fill="${C.navy}" stroke="${C.line2}"/><text x="${cx + w / 2}" y="190" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.goldSoft}">${esc(c)}</text>`;
    cx += w + 8;
    return s;
  }).join("");
  const tagW = Math.round(tag.length * 8.6 + 34);
  seed = [...title].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(lines.join(" "))}</desc>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e2851"/><stop offset="1" stop-color="${C.navy2}"/></linearGradient>
  <clipPath id="c"><rect width="${W}" height="${H}" rx="18"/></clipPath>
</defs>
<style>.tw{animation:tw ease-in-out infinite alternate}@keyframes tw{from{opacity:.1}to{opacity:.8}}@media (prefers-reduced-motion:reduce){.tw{animation:none}}</style>
<g clip-path="url(#c)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${art ? "" : starfield(W, H, 16, (x, y) => x < W - 130 || y > 150)}
  ${wip ? "" : `<rect width="${W}" height="3" fill="${C.gold}" opacity=".85"/>`}
</g>
<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="17.5" fill="none" stroke="${wip ? C.gold : C.line2}" stroke-opacity="${wip ? ".45" : "1"}" stroke-width="1.5"${wip ? ' stroke-dasharray="10 8"' : ""}/>
<rect x="32" y="30" width="${tagW}" height="26" rx="13" fill="${C.gold}" fill-opacity=".12" stroke="${C.gold}" stroke-opacity=".45"/>
<circle cx="47" cy="43" r="4" fill="${C.gold}"/>
<text x="59" y="48" font-family="${MONO}" font-size="13" font-weight="700" letter-spacing="1.5" fill="${C.gold}">${esc(tag)}</text>
<text x="${W - 34}" y="54" text-anchor="end" font-family="${SANS}" font-size="24" fill="${C.gold}">↗</text>
<text x="32" y="98" font-family="${SANS}" font-size="30" font-weight="800" letter-spacing="-.5" fill="${C.white}">${esc(title)}</text>
${lines.map((l, i) => `<text x="32" y="${130 + i * 24}" font-family="${SANS}" font-size="18" fill="${C.muted}">${esc(l)}</text>`).join("")}
${art === "mark" ? `<g opacity="${wip ? ".45" : "1"}">${mark(W - 78, 122, 84)}</g>` : ""}
${art === "lockup" ? lockup(W - 60 - Math.round(LOCKUP.w * 112 / LOCKUP.h), 42, 112) : ""}
${chipSvg}
<text x="${W - 32}" y="191" text-anchor="end" font-family="${MONO}" font-size="13" fill="${C.faint}">${esc(link)}</text>
</svg>
`;
}

// ---------------------------------------------------------------- footer
function footer() {
  const W = 1200, H = 160;
  seed = 424242;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Skyver Labs">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.navy2}"/><stop offset="1" stop-color="${C.navy}"/></linearGradient>
  <clipPath id="c"><rect width="${W}" height="${H}" rx="18"/></clipPath>
</defs>
<style>.tw{animation:tw ease-in-out infinite alternate}@keyframes tw{from{opacity:.1}to{opacity:.9}}@media (prefers-reduced-motion:reduce){.tw{animation:none}}</style>
<g clip-path="url(#c)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${starfield(W, H, 45, (x, y) => x > 360 && x < 840)}
  <path d="M0 ${H} Q ${W / 2} ${H - 70} ${W} ${H}" fill="${C.gold}" opacity=".07"/>
</g>
<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="17.5" fill="none" stroke="${C.line2}" stroke-width="1.5"/>
${lockup(Math.round(W / 2 - (LOCKUP.w * 76 / LOCKUP.h) / 2), 22, 76)}
<text x="${W / 2}" y="126" text-anchor="middle" font-family="${SANS}" font-size="20" font-weight="600" fill="${C.muted}">Thanks for stopping by<tspan fill="${C.gold}">.</tspan></text>
</svg>
`;
}

const cards = {
  "card-media-toolkit": {
    tag: "OPEN SOURCE", title: "Media Toolkit",
    lines: ["Download from 1,700+ sites, record live streams,", "and turn any video into a transcript. Windows app."],
    chips: ["Python", "FastAPI", "yt-dlp", "Whisper"], link: "github",
  },
  "card-skyver-tools": {
    tag: "LIVE", title: "Skyver Tools",
    lines: ["A hub of free online tools: a blocklist", "checker and more on the way."],
    chips: ["Web", "Cloudflare"], link: "skyver.dev", art: "mark",
  },
  "card-seanema": {
    tag: "IN PROGRESS", title: "SeaNema",
    lines: ["A self-hosted media client that works with", "Stremio addons. Windows, Android, Linux, web."],
    chips: ["Tauri", "Rust", "React", "mpv"], link: "private for now",
  },
  "card-under-construction": {
    tag: "SKYVER LABS", title: "Under construction",
    lines: ["Something new is being built at Skyver Labs.", "Check back soon."],
    chips: [], link: "skyverlabs.com", art: "mark", wip: true,
  },
};

writeFileSync(join(OUT, "banner.svg"), banner());
writeFileSync(join(OUT, "footer.svg"), footer());
for (const [name, c] of Object.entries(cards)) writeFileSync(join(OUT, `${name}.svg`), card(c));
console.log("written");
