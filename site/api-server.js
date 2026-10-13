/* Server adapter: talks to server/app.py. Sessions use an HttpOnly cookie set by the server. */
(function (root) {
  "use strict";
  async function call(method, path, body) {
    const res = await fetch(path, { method, credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "glassbox" }, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) throw new Error((data && data.error) || "Something went wrong (" + res.status + ").");
    return data;
  }
  root.GB_API = {
    mode: "server",
    async me() { return (await call("GET", "/api/me")).user; },
    async login(email, password) { return (await call("POST", "/api/login", { email, password })).user; },
    async signup(f) { return (await call("POST", "/api/signup", f)).user; },
    async logout() { await call("POST", "/api/logout"); },
    async state() { return call("GET", "/api/state"); },
    async act(name, payload) { return call("POST", "/api/act/" + encodeURIComponent(name), payload || {}); },
    async enquiry(f) { await call("POST", "/api/enquiry", f); },
    async reset() { throw new Error("Reset is only available in the demo."); },
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
