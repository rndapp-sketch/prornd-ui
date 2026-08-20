# Routing external services through the backend

Last updated: 2026-08-19

## 1. The problem

`proxyOptions.ts` currently proxies four things besides the main Frappe
backend:

| Route | Target (env var) | What it's for |
|---|---|---|
| `/ledger-api` | `VITE_LEDGER_HOST:VITE_LEDGER_PORT` | Commit/payment ledger transactions |
| `/prod-rnd-files` | `VITE_MINIO_HOST:VITE_MINIO_PORT` | File storage (MinIO) |
| `/appwrite` | `VITE_APPWRITE_HOST:VITE_APPWRITE_PORT` | Messaging (realtime chat) |
| `/attendance-api` | `VITE_ATTENDANCE_HOST:VITE_ATTENDANCE_PORT` | Leave module absence lookups |

This proxy only exists in **`vite dev`** and **`vite preview`** — it is a
Vite server feature, not something that ships in the production build. In
production (the built SPA served by Frappe/nginx, or standalone via
`deploy-prod.sh`), none of these four routes are proxied by anything unless
the production web server is separately configured to do it. Practically,
this has meant:

- The four internal IPs are baked directly into the shipped JS bundle
  (`VITE_*_HOST` values get inlined at build time), exposing internal
  network addresses in client-visible source.
- The browser must be able to reach each of those IPs/ports directly —
  works on an internal LAN, breaks the moment someone is off-network or
  those services aren't independently exposed to the internet.
- Every one of those four hosts needs its own CORS configuration, since the
  browser is calling them cross-origin.

The fix: move the actual outbound calls to Ledger, MinIO, and Attendance
into the Frappe backend (`rndopsapp`), behind ordinary whitelisted methods.
The frontend then calls same-origin `/api/method/...` like it does for
everything else, and the backend does the fetch server-side. Appwrite is a
partial exception — see §5.

## 2. Scope

In scope for a Python-side proxy: **Ledger API, MinIO, Attendance API**.
These are plain request/response HTTP APIs — trivial to wrap.

**Appwrite is different** and is called out separately in §5: the frontend
uses the official Appwrite Web SDK (`src/lib/appwrite.ts`), which opens its
own realtime WebSocket connection and manages auth/session state
client-side. A Python whitelisted method can't transparently relay a
WebSocket or reimplement the SDK's session handling — that needs an
nginx-level reverse proxy, not an `external_service.py` function. Don't
try to force it into the same pattern as the other three.

## 3. Backend changes (`rndopsapp`)

### 3.1 Config — don't hardcode hosts in Python either

Add these keys to the site's `site_config.json` (per-site, not committed to
git — same reasoning as why the frontend moved off hardcoded IPs):

```json
{
  "ledger_api_host": "172.16.134.81",
  "ledger_api_port": "18080",
  "minio_host": "172.16.135.118",
  "minio_port": "9000",
  "minio_bucket": "prod-rnd-files",
  "attendance_api_host": "172.16.135.27",
  "attendance_api_port": "7078"
}
```

Read them with `frappe.conf.get(...)`, never hardcode the IPs in
`external_service.py` itself — that just moves the same problem from the
frontend repo into the backend repo.

### 3.2 New file: `rndopsapp/rndopsapp/external_service.py`

```python
import frappe
import requests
from frappe import _

# Match the frontend's existing timeout conventions (proxyOptions.ts uses
# 60s for the main backend proxy) — keep these generous but bounded so a
# hung upstream doesn't hang a Frappe worker indefinitely.
REQUEST_TIMEOUT = 30


def _get_conf(key, label):
    value = frappe.conf.get(key)
    if not value:
        frappe.throw(_("Missing site_config key: {0}").format(key))
    return value


def _forward_response(resp):
    """Relay an upstream requests.Response back through Frappe's response,
    preserving status code and JSON/text body without forcing Frappe's own
    {"message": ...} envelope onto already-JSON upstream bodies."""
    frappe.response["http_status_code"] = resp.status_code
    content_type = resp.headers.get("Content-Type", "")
    if "application/json" in content_type:
        try:
            frappe.response.update(resp.json())
            return
        except ValueError:
            pass
    frappe.response["message"] = resp.text


# ── Ledger API ──────────────────────────────────────────────────────────
# Frontend today: fetch(`/ledger-api/${path}?...`)
# proxyOptions.ts rewrite was: strip "/ledger-api" prefix, replace with "/api"
@frappe.whitelist()
def ledger_proxy(path: str, **params):
    """Generic passthrough for the ledger service's /api/* routes.
    `path` is the part after /ledger-api/, e.g. "commit-payment-transactions".
    Any other kwargs are forwarded as query params.
    """
    host = _get_conf("ledger_api_host", "Ledger API host")
    port = _get_conf("ledger_api_port", "Ledger API port")
    params.pop("cmd", None)  # frappe.whitelist() injects this; don't forward it

    url = f"http://{host}:{port}/api/{path.lstrip('/')}"
    resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
    _forward_response(resp)


# ── MinIO (file storage) ────────────────────────────────────────────────
# Frontend today: <a href="/prod-rnd-files/{object_path}"> — direct file
# links/downloads, not JSON. This needs a streaming passthrough, not a
# whitelisted RPC method returning JSON, since browsers <a>/<img> tags hit
# it directly and expect the raw file bytes + correct Content-Type.
@frappe.whitelist(allow_guest=False)
def minio_file(object_path: str):
    """Streams a file straight from MinIO through Frappe.
    object_path is the path after /prod-rnd-files/, e.g.
    "Project_Registration/2026.../attachments/file.pdf".
    """
    host = _get_conf("minio_host", "MinIO host")
    port = _get_conf("minio_port", "MinIO port")
    bucket = frappe.conf.get("minio_bucket", "prod-rnd-files")

    url = f"http://{host}:{port}/{bucket}/{object_path.lstrip('/')}"
    upstream = requests.get(url, stream=True, timeout=REQUEST_TIMEOUT)

    if upstream.status_code != 200:
        frappe.throw(_("File not found"), frappe.DoesNotExistError)

    frappe.response["type"] = "binary"
    frappe.response["filecontent"] = upstream.content
    frappe.response["display_content_as"] = "inline"
    content_type = upstream.headers.get("Content-Type")
    if content_type:
        frappe.response["content_type"] = content_type


# ── Attendance API ──────────────────────────────────────────────────────
# Frontend today: fetch(`/attendance-api/attendance/absents/${username}`)
# proxyOptions.ts rewrite was: strip "/attendance-api" prefix, replace with "/api"
@frappe.whitelist()
def attendance_proxy(path: str, **params):
    host = _get_conf("attendance_api_host", "Attendance API host")
    port = _get_conf("attendance_api_port", "Attendance API port")
    params.pop("cmd", None)

    url = f"http://{host}:{port}/api/{path.lstrip('/')}"
    resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
    _forward_response(resp)
```

Adjust method signatures to match each upstream's actual verbs — the
snippets above assume GET, since that's all the current frontend call
sites use (confirmed in §4). If any call site needs POST (e.g. a future
ledger write), add a matching `_proxy` variant that reads
`frappe.request.data` and forwards it as the request body.

### 3.3 Security notes

- `ledger_proxy` / `attendance_proxy` as written are reachable by any
  logged-in user (`@frappe.whitelist()` defaults to `allow_guest=False`).
  If any of the underlying data is role-sensitive, add a
  `frappe.has_permission(...)`/role check at the top of the function —
  same as any other whitelisted method in this codebase.
- `minio_file` streams whatever `object_path` resolves to. Validate/sanitize
  it before building the URL (reject `..`, absolute paths, anything that
  could path-traverse outside the intended bucket prefix) — don't trust the
  frontend's path construction blindly just because it currently only sends
  well-formed paths.
- None of these need `csrf_exempt` — they're called the same way as every
  other `useFrappePostCall`/`fetch('/api/method/...')` call already in this
  app, which already sends the CSRF token.

## 4. Frontend changes (this repo)

Once the backend methods exist, replace every direct call. Summary of
what's calling what today (from a repo-wide grep):

### Ledger API — replace `/ledger-api/...` fetches

Call sites: `src/components/CommitPayment.tsx`,
`src/components/ProjectLedgerModal.tsx` (×2), `src/hooks/useProjectBudget.ts`,
`src/pages/ProjectSearch.tsx` (×2), `src/pages/ProjectLedgerFull.tsx` (×2),
`src/pages/application/TADASettlementForm.tsx`,
`src/pages/application/SalaryModule.tsx`,
`src/pages/ProjectDetailsOverview.tsx`, and the shared
`src/services/ledgerService.ts`.

Before:
```ts
const response = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${projectName}&accountHeadId=${headId}`);
```

After:
```ts
const response = await fetch(
  `/api/method/rndopsapp.rndopsapp.external_service.ledger_proxy?path=commit-payment-transactions&projectNumber=${projectName}&accountHeadId=${headId}`,
);
const { message } = await response.json();
```

`ledgerService.ts` is the one shared module — fixing its base URL there
first, then checking each direct-`fetch` call site individually, is the
efficient order (some call sites may already go through `ledgerService.ts`
rather than calling `fetch` themselves — check before duplicating logic).

### MinIO — replace `/prod-rnd-files/...` links and `getFileUrl()`

Call sites: `src/config.ts`, `src/utils/fileUtils.ts` (the shared
`getFileUrl()` helper — fix this one and most callers update for free),
`src/pages/ProjectDetails.tsx`, `src/pages/ProjectRegistration.tsx`,
`src/pages/ProjectDetailsOverview.tsx`.

Before (`fileUtils.ts`):
```ts
const MINIO_BASE = `http://${MINIO_HOST}:${MINIO_PORT}/prod-rnd-files`;
// ...
return `http://${MINIO_HOST}:${MINIO_PORT}${path}`;
```

After:
```ts
// object_path must NOT include the leading "/prod-rnd-files/" — the
// backend adds the bucket itself.
return `/api/method/rndopsapp.rndopsapp.external_service.minio_file?object_path=${encodeURIComponent(objectPath)}`;
```

Since `minio_file` streams the raw file (not JSON), this URL works directly
in `<a href>`, `<img src>`, and `window.open()` — no fetch/JSON-unwrap
needed, same usage pattern as today's direct MinIO links.

### Attendance API — replace `/attendance-api/...` fetches

Call sites: `src/pages/LeaveModule.tsx`, `src/pages/LeaveModuleForm.tsx`.

Before:
```ts
fetch(`/attendance-api/attendance/absents/${username}`)
```

After:
```ts
fetch(`/api/method/rndopsapp.rndopsapp.external_service.attendance_proxy?path=attendance/absents/${username}`)
```

### `.env` / `.env.production` cleanup

Once nothing in `src/` reads `VITE_LEDGER_HOST`, `VITE_LEDGER_PORT`,
`VITE_MINIO_HOST`, `VITE_MINIO_PORT`, `VITE_MINIO_ALT_PORT`,
`VITE_ATTENDANCE_HOST`, or `VITE_ATTENDANCE_PORT` directly (confirm with a
repo-wide grep after the above changes land), remove those vars — the
frontend no longer needs to know those hosts exist at all, since it only
ever talks to its own origin now.

## 5. Appwrite — not part of this proxy, here's why and what to do instead

Appwrite is excluded because the frontend uses the real Appwrite Web SDK
(`src/lib/appwrite.ts`), which:

1. Opens a **WebSocket** to `${endpoint}/realtime` for live chat/messages —
   a Frappe whitelisted method is a single request/response RPC call, it
   cannot hold open or relay a WebSocket connection.
2. Manages its own session cookies/JWT handling internally — reimplementing
   that server-side would mean rebuilding a meaningful chunk of the SDK.

**What to do instead:** keep proxying Appwrite at the **web server level**
(nginx), not through Frappe/Python. Two options:

- If Frappe's own nginx (bench-managed) fronts this app in production, add
  a `location /appwrite/ { proxy_pass ...; proxy_set_header Upgrade
  $http_upgrade; proxy_set_header Connection "upgrade"; }` block there,
  mirroring what `proxyOptions.ts`'s dev-only `/appwrite` entry does now.
- Alternatively, put Appwrite itself behind its own dedicated
  reverse-proxy/subdomain with real TLS, and point
  `VITE_APPWRITE_ENDPOINT` at that origin directly instead of a relative
  `/appwrite/v1` path — this is what `.env.production` already hints at
  (see the comment above `VITE_APPWRITE_ENDPOINT` in that file).

Either way this is infrastructure/nginx config, not a code change in
`external_service.py` — flagging it so it doesn't get silently dropped
because it didn't fit the same pattern as the other three.

## 6. Migration checklist

- [ ] Add `ledger_api_host`, `ledger_api_port`, `minio_host`, `minio_port`,
      `minio_bucket`, `attendance_api_host`, `attendance_api_port` to
      `site_config.json` on every environment (dev, `pragati`, prod).
- [ ] Add `rndopsapp/rndopsapp/external_service.py` (§3.2), adjust the
      module path in the frontend calls if it ends up living somewhere
      other than `rndopsapp.rndopsapp.external_service`.
- [ ] `bench restart` / clear cache so the new whitelisted methods are
      picked up.
- [ ] Update the frontend call sites in §4, file by file.
- [ ] Remove the now-unused `sharedProxyEntries` routes from
      `proxyOptions.ts` (`/ledger-api`, `/prod-rnd-files`,
      `/attendance-api` — leave `/appwrite` in place, dev still needs it).
- [ ] Remove the now-unused env vars from `.env`/`.env.production`.
- [ ] Set up the nginx-level Appwrite proxy per §5 for any environment
      that doesn't already have direct Appwrite reachability.
- [ ] Smoke-test each of the three proxied features (ledger balance
      lookups, file attachment viewing/downloading, leave-module absence
      lookups) end-to-end after the frontend switch.
