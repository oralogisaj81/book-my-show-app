#!/usr/bin/env node
// Aggregates every tests/*.js findings file (security-test/reports/<ts>/raw/*.json)
// into report.md and report.html, built from the same findings/counts data so
// the two formats can never drift apart — no markdown-to-HTML parsing step,
// just two renderers over one shared model. Usage:
//   node generate-report.js <raw-dir> <md-out-path>
// (the HTML path is derived by swapping the .md extension for .html)
import fs from 'node:fs';
import path from 'node:path';

const [, , rawDir, mdOutPath] = process.argv;
if (!rawDir || !mdOutPath) {
  console.error('usage: generate-report.js <raw-dir> <md-out-path>');
  process.exit(1);
}
const htmlOutPath = mdOutPath.endsWith('.md') ? mdOutPath.slice(0, -3) + '.html' : mdOutPath + '.html';

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Info'];
const SEVERITY_COLOR = {
  Critical: '#ffe0e0', High: '#ffe9d6', Medium: '#fff6cf', Low: '#e3f0ff', Info: '#eeeeee',
};

const files = fs.existsSync(rawDir) ? fs.readdirSync(rawDir).filter((f) => f.endsWith('.json')) : [];
let findings = [];
for (const file of files) {
  const category = file.replace(/\.json$/, '');
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf8'));
  } catch {
    console.error(`WARNING: could not parse ${file} — skipping (its test likely crashed before writing valid JSON)`);
    continue;
  }
  for (const f of parsed) findings.push({ ...f, category });
}

findings.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

const counts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0]));
for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;

const generatedAt = new Date().toISOString();
const emptyStateText = 'No findings. This means the test catalog found nothing to report on this run — it does not mean the app is bulletproof. Re-run after any change to auth, authorization, or input-handling code.';

function renderMarkdown() {
  const lines = [];
  lines.push('# CineHall security test report');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push('');
  lines.push('## Executive summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|---|---|');
  for (const s of SEVERITY_ORDER) lines.push(`| ${s} | ${counts[s]} |`);
  lines.push('');

  if (findings.length === 0) {
    lines.push(emptyStateText);
  } else {
    lines.push('## Findings');
    lines.push('');
    for (const f of findings) {
      lines.push(`### ${f.title}`);
      lines.push('');
      lines.push(`- **Severity**: ${f.severity}`);
      lines.push(`- **OWASP category**: ${f.owasp}`);
      lines.push(`- **Location**: ${f.location}`);
      lines.push(`- **Status**: ${f.status ?? 'Open'}`);
      lines.push('');
      lines.push(`**Description**: ${f.description}`);
      lines.push('');
      lines.push('**Evidence**:');
      lines.push('```');
      lines.push(f.evidence);
      lines.push('```');
      lines.push('');
      lines.push(`**Recommended fix**: ${f.fix}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }
  return lines.join('\n');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function severityBadge(s) {
  return `<span class="badge" style="background:${SEVERITY_COLOR[s] ?? '#eee'}">${escapeHtml(s)}</span>`;
}

function renderHtml() {
  const summaryRows = SEVERITY_ORDER.map((s) => `<tr><td>${severityBadge(s)}</td><td>${counts[s]}</td></tr>`).join('\n');

  const findingsHtml = findings.length === 0
    ? `<p>${escapeHtml(emptyStateText)}</p>`
    : findings.map((f) => `
<h3>${escapeHtml(f.title)}</h3>
<ul>
  <li><strong>Severity</strong>: ${severityBadge(f.severity)}</li>
  <li><strong>OWASP category</strong>: ${escapeHtml(f.owasp)}</li>
  <li><strong>Location</strong>: <code>${escapeHtml(f.location)}</code></li>
  <li><strong>Status</strong>: ${escapeHtml(f.status ?? 'Open')}</li>
</ul>
<p><strong>Description</strong>: ${escapeHtml(f.description)}</p>
<p><strong>Evidence</strong>:</p>
<pre><code>${escapeHtml(f.evidence)}</code></pre>
<p><strong>Recommended fix</strong>: ${escapeHtml(f.fix)}</p>
<hr>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CineHall security test report</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    max-width: 900px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem;
    line-height: 1.55; color: #1c1c1e; background: #fff;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e6e6e6; background: #121212; }
    table { border-color: #333 !important; }
    th { background: #1f1f1f !important; }
    tr:nth-child(even) td { background: #181818 !important; }
    code, pre { background: #1e1e1e !important; color: #e6e6e6 !important; }
    hr { border-color: #333 !important; }
  }
  h1 { font-size: 1.7rem; border-bottom: 2px solid #ddd; padding-bottom: .4rem; }
  h2 { font-size: 1.3rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: .3rem; }
  h3 { font-size: 1.05rem; margin-top: 1.8rem; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: .92rem; }
  th, td { border: 1px solid #ccc; padding: .45rem .7rem; text-align: left; vertical-align: top; }
  th { background: #f2f2f2; }
  tr:nth-child(even) td { background: #fafafa; }
  code { background: #f0f0f0; padding: .1rem .35rem; border-radius: 3px; font-size: .88em; }
  pre { background: #f5f5f5; padding: .9rem 1rem; border-radius: 6px; overflow-x: auto; font-size: .82rem; white-space: pre-wrap; word-break: break-word; }
  pre code { background: none; padding: 0; }
  hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
  .badge { display: inline-block; padding: .1rem .55rem; border-radius: 999px; font-size: .78rem; font-weight: 600; }
</style>
</head>
<body>
<h1>CineHall security test report</h1>
<p>Generated: ${escapeHtml(generatedAt)}</p>
<h2>Executive summary</h2>
<table>
<tr><th>Severity</th><th>Count</th></tr>
${summaryRows}
</table>
${findings.length > 0 ? '<h2>Findings</h2>' : ''}
${findingsHtml}
</body>
</html>
`;
}

fs.mkdirSync(path.dirname(mdOutPath), { recursive: true });
fs.writeFileSync(mdOutPath, renderMarkdown());
fs.writeFileSync(htmlOutPath, renderHtml());
console.log(`Wrote ${mdOutPath} and ${htmlOutPath} (${findings.length} finding${findings.length === 1 ? '' : 's'})`);
