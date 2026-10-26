// Builds the single-file version of the page that runs inside Claude as an artifact.
// Usage: npm run build:artifact  ->  dist/commander-forge.html
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const html = read("public/index.html");
const body = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>")).replace(/<script src="js\/app.js"><\/script>/, "").trim();
const title = html.match(/<title>.*?<\/title>/)[0];
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/)[0];
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const out = `${title}
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
${fonts}
<style>
${read("public/css/app.css")}</style>

${body}

<script type="application/json" id="preconData">${safe(read("public/data/precons.json"))}</script>
<script type="application/json" id="cmdData">${safe(read("public/data/commanders.json"))}</script>
<script>
${safe(read("public/js/app.js"))}</script>
`;
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/commander-forge.html"), out);
console.log(`dist/commander-forge.html (${(out.length / 1024).toFixed(0)} KB)`);
