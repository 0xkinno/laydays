// Generates the hand-authored SVG art. Run: node scripts/gen-art.mjs
import { writeFileSync } from "node:fs";
const INK = "#14160F", HARBOUR = "#0F3A34", SIGNAL = "#D7F34A", FLARE = "#FF5A2C";
const n = (x) => Math.round(x * 10) / 10;
const NS = 'vector-effect="non-scaling-stroke"';
const p = (d, o = {}) => `<path d="${d}" ${NS} fill="${o.fill ?? "none"}" stroke="${o.stroke ?? HARBOUR}" stroke-width="${o.w ?? 1.15}" ${o.op ? `stroke-opacity="${o.op}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`;

function dialTicks({ cx, cy, r, a0, a1, len = 18, count = 90, flareFrom = 84, inkOp = 0.3 }) {
  const ink = [], flare = [];
  for (let i = 1; i <= count; i++) {
    const t = (a0 + ((a1 - a0) * (i - 1)) / (count - 1)) * (Math.PI / 180);
    const major = i % 10 === 0 || i === 1 || i === 83 || i === 90;
    const l = major ? len * 1.7 : len;
    const x1 = cx + Math.cos(t) * r, y1 = cy + Math.sin(t) * r;
    const x2 = cx + Math.cos(t) * (r + l), y2 = cy + Math.sin(t) * (r + l);
    (i >= flareFrom ? flare : ink).push(`M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`);
  }
  return p(ink.join(""), { stroke: INK, op: inkOp, w: 1 }) + p(flare.join(""), { stroke: FLARE, w: 1.4 });
}

/* ---------------- hero tanker ---------------- */
const W = 1600, H = 900;
const parts = [];
// horizon and water
parts.push(p(`M0 520H${W}`, { op: 0.35 }));
parts.push(p(`M0 548H${W}`, { op: 0.12 }));
// quay in perspective, vanishing point on the right
const vp = [1480, 560];
for (let i = 0; i < 12; i++) {
  const x = -120 + i * 150;
  parts.push(p(`M${x} ${H}L${n(vp[0] + (x - vp[0]) * 0.18)} ${n(vp[1] + (H - vp[1]) * 0.18 + 120)}`, { stroke: INK, op: 0.1, w: 1 }));
}
for (let i = 0; i < 6; i++) { const y = 700 + i * 38; parts.push(p(`M0 ${y}H${W}`, { stroke: INK, op: 0.08 + i * 0.01, w: 1 })); }
parts.push(p(`M0 690H${W}`, { stroke: INK, op: 0.28 }));
// water ripples under hull
for (let i = 0; i < 9; i++) { const x = 380 + i * 120, y = 662 + (i % 3) * 7; parts.push(p(`M${x} ${y}q22 -5 44 0t44 0`, { op: 0.22, w: 1 })); }
// hull: stern at left, bow at right, three-quarter view
parts.push(p("M330 585L350 520H1090L1250 520Q1330 524 1392 566L1330 640H410Q350 640 330 585Z"));
parts.push(p("M345 548H1384", { op: 0.55 })); // sheer
parts.push(p("M330 585Q380 600 1340 602", { op: 0.4 })); // boot top
parts.push(p("M410 640H1330", { stroke: SIGNAL, w: 3.2 })); // waterline highlight
parts.push(p("M416 646H1322", { stroke: INK, op: 0.25, w: 1 }));
// bow flare and anchor
parts.push(p("M1392 566Q1372 552 1352 536M1360 580h18v10h-18z"));
// deck line and trunk
parts.push(p("M350 520L372 496H1220L1250 520", { op: 0.8 }));
// superstructure aft
parts.push(p("M392 496V392H522V496M392 392L418 366H548L522 392M548 366V470L522 496"));
for (let r = 0; r < 4; r++) parts.push(p(`M400 ${412 + r * 20}H514`, { op: 0.5, w: 1 }));
for (let c = 0; c < 6; c++) parts.push(p(`M${410 + c * 18} 410v62`, { op: 0.28, w: 1 }));
parts.push(p("M432 366V330H488V366M446 330V300L472 300V330")); // bridge wing and mast base
parts.push(p("M459 300V250M440 268H478M459 250l-9 -12M459 250l9 -12", { op: 0.9 }));
// funnel
parts.push(p("M500 392V344H540V392M498 344h44", { op: 0.9 }));
parts.push(p("M500 358H540", { stroke: SIGNAL, w: 2.4 }));
// deck pipework, manifold and cargo tanks hatches
parts.push(p("M600 496V474H1180V496", { op: 0.7 }));
for (let i = 0; i < 9; i++) parts.push(p(`M${640 + i * 62} 474v-14h22v14`, { op: 0.6, w: 1 }));
parts.push(p("M580 486H1200M580 478H1200", { op: 0.5, w: 1 }));
// manifold amidships with hose drop to the quay
parts.push(p("M860 486V430H900V486M850 430H910"));
// derrick / provision crane
parts.push(p("M780 496V388L1010 404M780 388L840 496M980 400V430", { op: 0.8 }));
// mooring lines to bollards
for (const [x1, y1, x2, y2] of [[372, 512, 250, 690], [1352, 540, 1500, 690], [900, 520, 940, 690], [470, 520, 430, 690]]) {
  parts.push(p(`M${x1} ${y1}Q${(x1 + x2) / 2} ${Math.max(y1, y2) - 20} ${x2} ${y2}`, { op: 0.55, w: 1 }));
  parts.push(p(`M${x2 - 8} ${y2}h16v-12h-16z`, { op: 0.8, w: 1 }));
}
// shore manifold, tank and stack on the quay (right), filled with paper so they hide the hull behind them
const PAPER = "#F2F1EA";
parts.push(p("M1090 690V566H1160V690Z M1090 566L1125 542L1160 566", { fill: PAPER }));
parts.push(p("M1210 690V512H1290V690Z M1210 512Q1250 484 1290 512M1210 556H1290M1210 610H1290", { fill: PAPER, op: 0.9 }));
parts.push(p("M1325 690V470H1362V690Z M1325 470h37", { fill: PAPER, op: 0.8 }));
parts.push(p("M1040 604H1090", {}));
parts.push(p("M880 430Q880 392 930 392H978"));
parts.push(p("M978 392Q1040 392 1040 470V604", { w: 1.6 })); // hose
parts.push(p("M1040 604q14 14 28 0", { op: 0.8 }));
parts.push(p("M1030 470h20M1030 520h20M1030 570h20", { op: 0.5, w: 1 })); // hose bands
// gantry crane on far quay
parts.push(p("M110 690V470L240 470M110 470L60 520M240 470V500M110 520H190", { op: 0.55, w: 1 }));
// gulls
parts.push(p("M260 250q14 -14 28 0q14 -14 28 0", { op: 0.5, w: 1 }));
parts.push(p("M1180 300q10 -10 20 0q10 -10 20 0", { op: 0.4, w: 1 }));
const tickDial = dialTicks({ cx: 860, cy: 565, r: 560, a0: 170, a1: 340, len: 16 });
const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="A chemical tanker moored at a quiet berth, inside a dial of 90 ticks">\n<title>Chemical tanker at a berth inside a 90 tick dial</title>\n<g>${tickDial}</g>\n<g>${parts.join("\n")}</g>\n</svg>\n`;
writeFileSync("public/art/hero-tanker.svg", hero);

/* ---------------- mark ---------------- */
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Laydays mark">
<rect x="3" y="3" width="58" height="58" rx="14" fill="${INK}"/>
<g fill="none" stroke="${SIGNAL}" stroke-linecap="round">${(() => { let s = ""; for (let i = 0; i < 18; i++) { const t = (-170 + (i * 160) / 17) * Math.PI / 180; const r1 = 21, r2 = i % 5 === 0 ? 27 : 24.5; s += `<path d="M${n(32 + Math.cos(t) * r1)} ${n(40 + Math.sin(t) * r1)}L${n(32 + Math.cos(t) * r2)} ${n(40 + Math.sin(t) * r2)}" stroke-width="1.6" stroke-opacity="${i > 15 ? 1 : 0.55}"/>`; } return s; })()}
<path d="M10 38q7 -9 14 0t14 0t14 0t10 -3" stroke-width="2.6"/></g></svg>\n`;
writeFileSync("public/art/mark.svg", mark);
writeFileSync("docs-mark.tmp", mark);

/* ---------------- dial ---------------- */
const dial = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Dial of 90 ticks, the last seven in flare orange">
${dialTicks({ cx: 200, cy: 200, r: 150, a0: -90, a1: 266, len: 16, inkOp: 0.45 })}
<circle cx="200" cy="200" r="112" fill="none" stroke="${HARBOUR}" stroke-width="1" stroke-opacity="0.35" vector-effect="non-scaling-stroke"/>
</svg>\n`;
writeFileSync("public/art/dial.svg", dial);

/* ---------------- rulebooks ---------------- */
const rb = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 520" role="img" aria-label="Three rulebooks converge into one reasoning graph, then the clock and the signature">
${[0, 1, 2].map((i) => { const x = 140 + i * 280; return p(`M${x} 40V250`, { stroke: INK, op: 0.5 }) + p(`M${x - 90} 40H${x + 90}M${x - 90} 70H${x + 90}M${x - 90} 100H${x + 60}M${x - 90} 130H${x + 80}M${x - 90} 160H${x + 40}`, { stroke: INK, op: 0.35, w: 1 }) + p(`M${x} 250C${x} 340 520 330 520 392`, { stroke: HARBOUR, w: 1.3 }); }).join("")}
<circle cx="520" cy="410" r="26" fill="${SIGNAL}" stroke="${INK}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
${p("M546 410H760", { stroke: HARBOUR, w: 1.3 })}
<rect x="760" y="380" width="150" height="60" rx="14" fill="none" stroke="${INK}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
${p("M910 410H1010", { stroke: HARBOUR, w: 1.3 })}
<path d="M1010 410q18 -34 36 0t36 0t36 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
</svg>\n`;
writeFileSync("public/art/rulebooks.svg", rb);

/* ---------------- receipt ---------------- */
const rows = [0, 1, 2, 3, 4, 5].map((i) => p(`M40 ${150 + i * 34}H${i % 2 ? 250 : 290}M${300} ${150 + i * 34}H340`, { stroke: INK, op: 0.4, w: 1 })).join("");
let zig = "M20 10"; for (let i = 0; i < 18; i++) zig += `l${i % 2 ? 10 : 10} ${i % 2 ? -8 : 8}`;
const receipt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 440" role="img" aria-label="Printed receipt with a refusal stamp">
<path d="M20 20H340V420L320 408L300 420L280 408L260 420L240 408L220 420L200 408L180 420L160 408L140 420L120 408L100 420L80 408L60 420L40 408L20 420Z" fill="none" stroke="${INK}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
${p("M40 60H200", { stroke: INK, w: 1.4 })}${p("M40 84H140", { stroke: INK, op: 0.4, w: 1 })}${rows}
<g transform="rotate(-8 190 340)"><rect x="76" y="306" width="228" height="56" rx="10" fill="none" stroke="${FLARE}" stroke-width="2" vector-effect="non-scaling-stroke"/>${p("M96 334H284", { stroke: FLARE, w: 2 })}</g>
</svg>\n`;
writeFileSync("public/art/receipt.svg", receipt);
console.log("art written");
