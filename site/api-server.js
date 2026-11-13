/* Server adapter: talks to the backend (backend/app.py; the older server/app.py has no account endpoints). Sessions use an HttpOnly cookie set by the server. */
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
    // Resolves with the user, or with { mfa: true } when the account needs a two-step code next.
    async login(email, password) { const d = await call("POST", "/api/login", { email, password }); return d.mfa_required ? { mfa: true } : d.user; },
    async loginCode(code) { return (await call("POST", "/api/login/mfa", { code })).user; },
    account: {
      security: () => call("GET", "/api/account/security"),
      setup: () => call("POST", "/api/account/two-step/setup"),
      enable: (code) => call("POST", "/api/account/two-step/enable", { code }),
      disable: (password, code) => call("POST", "/api/account/two-step/disable", { password, code }),
      password: (password, new_password) => call("POST", "/api/account/password", { password, new_password }),
      signOutOthers: () => call("POST", "/api/account/sign-out-others"),
      forgot: (email) => call("POST", "/api/password/forgot", { email }),
      reset: (token, password) => call("POST", "/api/password/reset", { token, password }),
    },
    async signup(f) { return (await call("POST", "/api/signup", f)).user; },
    async logout() { await call("POST", "/api/logout"); },
    async state() { return call("GET", "/api/state"); },
    async act(name, payload) { return call("POST", "/api/act/" + encodeURIComponent(name), payload || {}); },
    async enquiry(f) { await call("POST", "/api/enquiry", f); },
    async upload(file, fields) {
      const fd = new FormData(); fd.append("file", file);
      for (const k in fields || {}) if (fields[k] != null) fd.append(k, fields[k]);
      const res = await fetch("/api/upload", { method: "POST", credentials: "same-origin", headers: { "X-Requested-With": "glassbox" }, body: fd });
      let data = null; try { data = await res.json(); } catch (e) { /* empty body */ }
      if (!res.ok) throw new Error((data && data.error) || "Upload failed (" + res.status + ").");
      return data.file;
    },
    // KYC, e-signing and payments: each start call answers with the provider page to send the person to.
    integrations: {
      kycStatus: () => call("GET", "/api/kyc"),
      kycStart: (pan, name) => call("POST", "/api/kyc/start", { pan, name }),
      signNda: (intro_id) => call("POST", "/api/esign/nda", { intro_id }),
      sendEngagement: (company_id, advisory_fee_lakh) => call("POST", "/api/esign/engagement", { company_id, advisory_fee_lakh }),
      startSigning: (id) => call("POST", "/api/esign/" + encodeURIComponent(id) + "/start"),
      signedCopy: async (id) => {
        const res = await fetch("/api/esign/" + encodeURIComponent(id) + "/document", { credentials: "same-origin" });
        if (!res.ok) { let d = null; try { d = await res.json(); } catch (e) { /* not JSON */ } throw new Error((d && d.error) || "Download failed (" + res.status + ")."); }
        return res.blob();
      },
      pay: (invoice_id) => call("POST", "/api/pay/" + encodeURIComponent(invoice_id)),
    },
    async reset() { throw new Error("Reset is only available in the demo."); },
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
