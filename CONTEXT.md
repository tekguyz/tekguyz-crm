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

## Leads

**Lead Pack**:
The weekly CSV of new leads from Muse (Meta AI), imported by hand into leads. Most of its leads have no email.
_Avoid_: Scrape, prospect list

**Contact Channel**:
Any way to reach a lead: email, phone, website, Facebook, Instagram, WhatsApp or a Google Business Profile. Every lead needs a name and at least one. Email is required only on the website's contact form, never anywhere else in the CRM.
_Avoid_: Sending Channel (the outreach playbook's narrower term, where phone and Google do not count)

**Duplicate Lead**:
A new row that is the same business as a lead already in the organization, because a link, an email or a phone or WhatsApp number matches. A matching name alone never makes a Duplicate Lead. An import skips a Duplicate Lead; it never overwrites the existing one.
_Avoid_: Dupe, conflict
