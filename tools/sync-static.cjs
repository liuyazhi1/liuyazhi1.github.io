// Copy generated site output only. Never delete directories or copy repository sources.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const allowed = new Set(['about', 'archives', 'blog', 'categories', 'css', 'js', 'projects', 'tags', 'wiki', 'images', 'music']);
const rootFiles = new Set(['index.html', '404.html', 'search.json']);
const copies = [];
function rejectLink(file) {
  if (fs.lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`Refusing symlink: ${file}`);
}
rejectLink(output);
if (!fs.existsSync(path.join(output, 'index.html'))) throw new Error('Run npm run verify before syncing.');
function collect(directory, relative = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    const from = path.join(output, name);
    const to = path.resolve(root, name);
    if (!to.startsWith(root + path.sep)) throw new Error(`Outside repository: ${name}`);
    const first = name.split(path.sep)[0];
    if (!allowed.has(first) && !/^\d{4}$/.test(first) && !rootFiles.has(name)) throw new Error(`Not a publish path: ${name}`);
    rejectLink(from);
    let ancestor = to;
    while (ancestor !== root) { rejectLink(ancestor); ancestor = path.dirname(ancestor); }
    if (entry.isDirectory()) collect(from, name);
    else if (entry.isFile()) copies.push([from, to]);
    else throw new Error(`Not a regular file: ${name}`);
  }
}
collect(output);
for (const [from, to] of copies) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
console.log(`Synced ${copies.length} generated files. Sources and .nojekyll unchanged; no files deleted.`);
