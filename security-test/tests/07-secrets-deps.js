// Category 7: Secrets and dependency hygiene (OWASP A02:2021 / A06:2021).
// This one is static/repo-level, not HTTP-driven — it shells out to grep,
// git, and npm audit rather than hitting BASE_URL. Run it from the repo
// root (the runner script's cwd already is). This is a single-language
// (TS/JS) stack — no Maven/backend dependency-check step, unlike the
// reference Spring Boot target.
import { execSync } from 'node:child_process';
import { parseArgs, finding, writeFindings } from '../lib/findings.js';

const { out } = parseArgs(process.argv.slice(2)); // baseUrl unused here, kept for a uniform CLI across test files
const findings = [];

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    // Non-zero exit is meaningful for grep (no matches) and npm audit
    // (vulnerabilities found) — return stdout either way, let the caller
    // interpret it rather than treating exit code as pass/fail.
    return err.stdout ?? '';
  }
}

// -- Hardcoded credentials outside gitignored local-config files ---------
// Pattern is intentionally narrow (real-looking secret assignments) to
// avoid flooding findings with false positives on words like "password"
// appearing in field names or test fixtures (e.g. TEST_PASSWORD constants,
// which this suite's own lib/auth.js has one of — excluded via the
// security-test/ path filter below).
const grepPattern = String.raw`(password|secret|api[_-]?key)\s*[:=]\s*['"][^'"\s]{6,}['"]`;
const grepOut = sh(`grep -rniE "${grepPattern}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l . 2>/dev/null | grep -v node_modules | grep -v '/dist/' | grep -v '/dist-server/' | grep -v '/e2e/' | grep -v '/load-test/' | grep -v '/security-test/'`);
const suspectFiles = grepOut.split('\n').map((l) => l.trim()).filter(Boolean);

for (const file of suspectFiles) {
  findings.push(finding({
    title: `Possible hardcoded credential pattern in source: ${file}`,
    severity: 'High',
    owasp: 'A02:2021 – Cryptographic Failures / A05:2021 – Security Misconfiguration',
    location: file,
    description: 'A source file (not a gitignored local-config file) matched a password/secret/api-key assignment pattern. Verify manually — this grep is intentionally broad and can catch legitimate field names or fixtures.',
    evidence: `grep -rniE "${grepPattern}" ${file} (matched — re-run to see the exact line; value intentionally not echoed here)`,
    fix: 'Move any real credential to an environment variable (this app already uses DATABASE_URL/SESSION_SECRET via .env — see .env.example) rather than a literal in source.',
  }));
}

// -- Local-config files that should be gitignored, actually are ----------
const candidateConfigFiles = sh('find . -iname "*.env" -o -iname ".env*" 2>/dev/null')
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.includes('node_modules') && !l.endsWith('.env.example'));

for (const file of candidateConfigFiles) {
  const checkOut = sh(`git check-ignore -v "${file}" 2>&1`);
  const isIgnored = checkOut.trim().length > 0 && !checkOut.includes('fatal');
  if (!isIgnored) {
    findings.push(finding({
      title: `Local-config file with likely real credentials is not gitignored: ${file}`,
      severity: 'Critical',
      owasp: 'A02:2021 – Cryptographic Failures',
      location: file,
      description: 'This file matches the .env/.env.* naming pattern this repo uses for real local credentials (DATABASE_URL, SESSION_SECRET) but git check-ignore did not confirm it is excluded from version control.',
      evidence: `git check-ignore -v "${file}" -> ${checkOut.trim() || '(no match — not ignored)'}`,
      fix: 'Add an entry matching this exact path to .gitignore, and if it has ever been committed, rotate every credential inside it (DATABASE_URL, SESSION_SECRET) and purge it from history.',
    }));
  }
}

if (candidateConfigFiles.length > 0 && findings.every((f) => !f.title.startsWith('Local-config file'))) {
  findings.push(finding({
    title: `Verified: all ${candidateConfigFiles.length} local .env file(s) are gitignored`,
    severity: 'Info',
    owasp: 'A02:2021 – Cryptographic Failures',
    location: candidateConfigFiles.join(', '),
    description: '.gitignore\'s `.env` and `.env.*` (with a `!.env.example` exception) entries were confirmed via git check-ignore -v against each real local-config file found, not just assumed from the pattern existing in .gitignore.',
    evidence: candidateConfigFiles.map((f) => `git check-ignore -v "${f}" -> ${sh(`git check-ignore -v "${f}" 2>&1`).trim()}`).join('\n'),
    fix: 'N/A — re-run if a new .env-style file is ever added.',
  }));
}

// -- Dependency audit (Critical/High only, summarized) --------------------
function summarizeNpmAudit() {
  const raw = sh('npm audit --omit=dev --json 2>/dev/null');
  try {
    const parsed = JSON.parse(raw);
    const vulns = Object.values(parsed.vulnerabilities ?? {});
    const highOrCritical = vulns.filter((v) => v.severity === 'high' || v.severity === 'critical');
    return highOrCritical.map((v) => `${v.name}@${v.range ?? '?'} (${v.severity})`);
  } catch {
    return null; // npm audit not runnable here — skip, don't fail the whole category
  }
}

const npmHighCritical = summarizeNpmAudit();
if (npmHighCritical && npmHighCritical.length > 0) {
  findings.push(finding({
    title: `${npmHighCritical.length} High/Critical npm dependency vulnerabilit${npmHighCritical.length === 1 ? 'y' : 'ies'}`,
    severity: 'High',
    owasp: 'A06:2021 – Vulnerable and Outdated Components',
    location: 'package.json / package-lock.json',
    description: `npm audit reported: ${npmHighCritical.join(', ')}`,
    evidence: `npm audit --omit=dev --json\nHigh/Critical: ${npmHighCritical.join(', ')}`,
    fix: 'Run `npm audit fix` where possible; for vulnerabilities without a compatible fix, evaluate whether the vulnerable code path is actually reachable in this app before deciding on an upgrade/replace/accept-risk call.',
  }));
} else if (npmHighCritical) {
  findings.push(finding({
    title: 'Verified: no High/Critical npm dependency vulnerabilities',
    severity: 'Info',
    owasp: 'A06:2021 – Vulnerable and Outdated Components',
    location: 'package.json / package-lock.json',
    description: 'npm audit --omit=dev reported no High/Critical severity findings as of this run.',
    evidence: 'npm audit --omit=dev --json -> no vulnerabilities at High/Critical severity',
    fix: 'N/A — re-run periodically as dependencies change.',
  }));
}

writeFindings(findings, out);
console.log(`07-secrets-deps: ${findings.length} finding(s)`);
