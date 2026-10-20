// Builds the offline test version (rules and bots run in the browser) as one self-contained
// HTML file, ready to publish as a private page. Output: packages/web/dist-offline/kontinentalist.html
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const web = new URL('../packages/web/', import.meta.url).pathname;
const out = join(web, 'dist-offline');
execSync('npx vite build --mode offline --outDir dist-offline --emptyOutDir', { cwd: web, stdio: 'inherit' });

const assets = join(out, 'assets');
const files = readdirSync(assets);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');

// The host page supplies <html>/<head>/<body>; this file carries only title, styles, root and script.
const page = `<title>Kontinentalist</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
writeFileSync(join(out, 'kontinentalist.html'), page);
console.log(`wrote ${join(out, 'kontinentalist.html')} (${Math.round(page.length / 1024)} KB)`);
