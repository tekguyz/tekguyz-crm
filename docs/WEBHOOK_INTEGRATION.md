# TEKGUYZ CRM — Inbound Lead Webhook Integration

**Audience:** a developer wiring a form, a CRM, or an automation tool into
TEKGUYZ CRM. This document is self-contained — you need nothing else to build a
working caller.

**Last changed:** 2026-08-18 (HMAC request signing replaced the URL-path
secret).

---

## 1. What you need

Both values are on the CRM's **Settings → Organization** panel. Only an owner or
an admin can see them.

| Value | Example | Secret? |
|---|---|---|
| **Endpoint URL** | `https://your-crm-host/api/v1/triage/cdf8217a-573a-4970-a88a-2c1541fc6d7b` | **No.** The trailing segment is your `organization_id`. It identifies the tenant and grants no access on its own. Safe in a config file, a ticket, or a log. |
| **Signing secret** | `4e6945a2-97c5-4490-be67-34b85885e3d6` | **Yes.** Treat it like a password. It is never transmitted — it only keys the signature. Store it in an environment variable or a secret manager, never in client-side code. |

---

## 2. The request

```
POST /api/v1/triage/<organization_id>
Content-Type: application/json
X-TekGuyz-Signature: <64 lowercase hex characters>

<JSON body>
```

### The signature

```
X-TekGuyz-Signature = hex( HMAC-SHA256( key = signing_secret, message = raw_request_body_bytes ) )
```

Precisely:

1. **Algorithm:** HMAC-SHA256.
2. **Key:** the signing secret, used as **UTF-8 bytes of the string exactly as
   shown in Settings**. Do not hex-decode it, base64-decode it, trim it, or
   change its case — it happens to look like a UUID, but it is treated as an
   opaque string.
3. **Message:** the **exact bytes of the request body you are about to send** —
   the same bytes, in the same order, that go on the wire.
4. **Encoding:** lowercase hexadecimal, 64 characters. Uppercase hex is also
   accepted. A `sha256=` prefix is **not** accepted — send bare hex only.
5. **Header name:** `X-TekGuyz-Signature` (HTTP header names are
   case-insensitive, so any casing of the name works).

> **The single most common way to get this wrong:** signing a *re-serialized*
> copy of the body. If you build an object, sign `JSON.stringify(obj)`, and then
> hand the object to an HTTP client that serializes it again, the two byte
> strings can differ — key order, whitespace, unicode escaping, and number
> formatting are all serializer-dependent. **Serialize once into a string or
> buffer, sign that exact value, and send that exact value.** When this is wrong
> it fails 100% of the time with a 401, not intermittently.

### Body fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `client_name` | string | **yes** | Must be non-empty after trimming. |
| `email` | string | **yes** | Must be a valid email. Lowercased on receipt. This is the contact's identity key. |
| `phone` | string | no | |
| `company` | string | no | |
| `website` | string | no | |
| `physical_address` | string | no | |
| `service_category` | string | no | |
| `lead_source` | string | no | Where the enquiry came from, e.g. `"Website contact form"`. |
| `message` | string | no | What the person actually wrote. Stored on the enquiry record. |

Unknown extra fields are ignored, not rejected.

### What happens to a repeat enquiry

Leads are keyed on `(organization, lowercased email)`. A second enquiry from the
same email **does not** create a second lead and **does not** overwrite the
contact's existing name, phone, company, website, address, category, or source —
those are first-known values. Each enquiry is stored as its own immutable
submission record, so the full history is kept. If the contact had been
archived, the enquiry reactivates it.

---

## 3. Responses

| Status | Body | Meaning |
|---|---|---|
| `200` | `{"success":true,"leadId":"<uuid>"}` | Accepted and stored. |
| `400` | `{"error":"Invalid JSON body"}` | Signature was valid; the body did not parse as JSON. |
| `400` | `{"error":"Invalid payload","issues":{…}}` | Signature was valid; a required field was missing or malformed. `issues` names the fields. |
| `401` | `{"error":"Unauthorized"}` | Authentication failed. |
| `429` | `{"error":"Rate limit exceeded (max 30/min)"}` | More than 30 accepted requests in the last 60 seconds for this organization. Honour `Retry-After`. |

**The `401` is deliberately uninformative.** It is returned identically for an
unknown organization id, a missing header, a malformed signature, and a wrong
signature. Nothing in the response tells you which half failed. If you get one,
check both: the org id in your URL and the secret you signed with.

If you get a `400`, your signature was already accepted — the problem is in the
payload. That is the fastest way to confirm your signing code works: sign an
intentionally empty object and look for a `400`, not a `401`.

---

## 4. Worked example (Node.js)

```js
import { createHmac } from "node:crypto";

const ENDPOINT = process.env.TEKGUYZ_WEBHOOK_URL;   // .../api/v1/triage/<organization_id>
const SECRET   = process.env.TEKGUYZ_SIGNING_SECRET;

export async function sendLead(lead) {
  // Serialize ONCE. This exact string is what gets signed and what gets sent.
  const body = JSON.stringify({
    client_name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    message: lead.message,
    lead_source: "Website contact form",
  });

  const signature = createHmac("sha256", SECRET).update(body, "utf8").digest("hex");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TekGuyz-Signature": signature,
    },
    body, // the same string that was signed — never re-serialize here
  });

  if (!res.ok) {
    throw new Error(`TekGuyz webhook rejected the lead: ${res.status} ${await res.text()}`);
  }

  return res.json(); // { success: true, leadId: "…" }
}
```

### The same thing in other runtimes

**PHP**

```php
$body = json_encode([
  'client_name' => $name,
  'email'       => $email,
  'message'     => $message,
]);
$signature = hash_hmac('sha256', $body, getenv('TEKGUYZ_SIGNING_SECRET'));
// POST $body with header:  X-TekGuyz-Signature: $signature
```

**Python**

```python
import hmac, hashlib, json, requests

body = json.dumps({"client_name": name, "email": email, "message": message})
signature = hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
requests.post(ENDPOINT, data=body, headers={
    "Content-Type": "application/json",
    "X-TekGuyz-Signature": signature,
})
```

Note `data=body` (the exact string), not `json={...}` — the latter re-serializes
and can change the bytes.

**curl, for a one-off test**

```bash
BODY='{"client_name":"Test Person","email":"test@example.com"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$TEKGUYZ_SIGNING_SECRET" | awk '{print $NF}')
curl -X POST "$TEKGUYZ_WEBHOOK_URL" -H "Content-Type: application/json" -H "X-TekGuyz-Signature: $SIG" --data-raw "$BODY"
```

`printf '%s'` rather than `echo` is load-bearing — `echo` appends a newline,
which changes the bytes and therefore the signature.

---

## 5. Browser-side forms cannot call this endpoint

Signing requires the secret, and anything a browser can read, every visitor can
read. There is no browser-safe way to do this.

**The shape that works:** your form posts to your own backend — a serverless
function, an API route, a PHP handler, anything that can hold an environment
variable — and that backend signs the payload and forwards it here. The secret
stays server-side.

CORS headers are still served for `https://tekguyz.com`, but only so a developer
testing from that origin sees a readable `401` instead of an opaque network
error. They do not make browser-side calling viable.

---

## 6. Rotating the signing secret

**Settings → Organization → Rotate signing secret.**

Rotation takes effect immediately and there is no grace period. The **endpoint
URL does not change** — it is keyed on the organization id, which is stable.
Only the secret changes. Update your integration's secret first, then rotate, or
expect `401`s in between.

Rotate if the secret is ever pasted somewhere it should not be, or if a
developer with access to it leaves.

---

## 7. Notes and limits

- **Rate limit:** 30 accepted requests per minute per organization.
- **No replay protection yet.** The signature covers the body but carries no
  timestamp or nonce, so an attacker who captured a valid signed request could
  resend those exact bytes. The impact is bounded — a replay re-submits an
  enquiry that already arrived, and repeats collapse onto the same lead rather
  than creating duplicates. Always call over HTTPS. A timestamp-bound signature
  is registered as deferred work in `docs/KNOWN_GAPS.md`.
- **The old scheme is gone.** `POST /api/v1/triage/<webhook_secret>` with no
  signature is not accepted in any form, and there is no compatibility path.
  A caller still using it receives a `401`.
