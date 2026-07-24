// Minimal cookie-jar-aware fetch wrapper. One instance per identity — each
// test creates its own client so two identities never share cookies by
// accident, which is the whole point when proving an IDOR/ownership check.
// Every call returns enough of the raw request/response to drop straight
// into a finding's Evidence field without re-deriving it later.

export class HttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cookies = new Map(); // name -> value
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  absorbSetCookie(response) {
    // Node's fetch (undici) exposes multiple Set-Cookie values via
    // getSetCookie() on newer runtimes; fall back to the single-header form
    // on older ones (fine here since this app only ever sets one cookie).
    const setCookies = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
    for (const raw of setCookies) {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      this.lastSetCookieRaw = raw;
    }
  }

  async request(method, path, { body, headers = {}, rawBody, skipCookies = false } = {}) {
    const url = `${this.baseUrl}${path}`;
    const reqHeaders = { ...headers };
    if (body !== undefined && rawBody === undefined) {
      reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
    }
    if (!skipCookies && this.cookies.size > 0) reqHeaders['Cookie'] = this.cookieHeader();

    const init = { method, headers: reqHeaders };
    if (rawBody !== undefined) init.body = rawBody;
    else if (body !== undefined) init.body = JSON.stringify(body);

    const response = await fetch(url, init);
    this.absorbSetCookie(response);

    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      // Not JSON — evidence still carries the raw text, which matters for
      // category 8 (error handling): a non-JSON body is itself a signal.
    }

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      bodyText: text,
      bodyJson: json,
      request: { method, url, headers: reqHeaders, body: rawBody ?? body },
    };
  }

  get(path, opts) { return this.request('GET', path, opts); }
  post(path, body, opts = {}) { return this.request('POST', path, { ...opts, body }); }
  patch(path, body, opts = {}) { return this.request('PATCH', path, { ...opts, body }); }
  put(path, body, opts = {}) { return this.request('PUT', path, { ...opts, body }); }
  delete(path, opts) { return this.request('DELETE', path, opts); }
}

// Turns a request/response pair into the exact repro text a finding's
// Evidence field wants — a reviewer should be able to replay it by eye.
export function evidenceFrom(result, { redact = [], note } = {}) {
  const redactText = (s) => redact.reduce(
    (acc, secret) => (secret ? acc.split(secret).join(`${secret.slice(0, 3)}…[redacted]`) : acc),
    s ?? ''
  );
  return [
    note,
    `${result.request.method} ${result.request.url}`,
    result.request.body !== undefined ? `Request body: ${redactText(JSON.stringify(result.request.body))}` : null,
    `Response: ${result.status}`,
    `Response body: ${redactText(result.bodyText).slice(0, 800)}`,
  ].filter(Boolean).join('\n');
}
