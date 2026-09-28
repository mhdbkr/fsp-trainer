export function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { data: null, body: md };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[')) v = JSON.parse(v);
    else v = v.replace(/^"(.*)"$/, '$1');
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}
