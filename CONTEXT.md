# TEKGUYZ CRM

A multi-tenant sales CRM. Each business is an organization; its members work its leads.

## Demo

**Landing Page**:
The public page at the bare origin that a signed-out visitor sees. It sells the app and holds the "Try the demo" button.
_Avoid_: Home page, marketing page, splash

**Guest**:
A person who pressed "Try the demo". Each press makes a new Guest, who is the OWNER of their own Demo Org.
_Avoid_: Demo visitor, demo user, anonymous user

**Demo Org**:
An organization made for exactly one Guest, filled with Sample Data, and deleted 7 days after it was made. No other Guest can see it.
_Avoid_: Demo tenant, sandbox, TEKGUYZ Demo

**Sample Data**:
The invented leads, prospects and tasks every new Demo Org starts with. It names no real person or company.
_Avoid_: Seed, fixture, fake data

**Demo Block**:
A server-side refusal of an action that costs money or reaches the outside world, shown to a Guest as "Not available in the demo."
_Avoid_: Read-only notice, disabled feature
