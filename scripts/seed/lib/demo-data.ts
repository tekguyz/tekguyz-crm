import { createAdminClient } from "./clients";
import { DEMO_ORG_NAME } from "./demo-org";

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function webhookPayload(payload: Record<string, string>): string {
  return JSON.stringify(payload);
}

// The demo leads' enquiry text already exists once, inside their WEBHOOK log
// payloads. Reading it back out here gives each seeded lead_submissions row a
// real message without a second copy of the same sentence to keep in sync.
// Seed-only: the live ingest path writes lead_submissions.message directly
// from the validated payload and never parses a log (that JSON-parsing shape
// is exactly what lead_submissions exists to replace).
function webhookMessageOf(logs: DemoLog[] | undefined): string | null {
  const webhook = logs?.find((log) => log.log_type === "WEBHOOK");
  if (!webhook) return null;

  try {
    const parsed: unknown = JSON.parse(webhook.content);
    const message = (parsed as Record<string, unknown>)?.message;
    return typeof message === "string" ? message : null;
  } catch {
    return null;
  }
}

type DemoLog = {
  log_type: "WEBHOOK" | "MANUAL_NOTE" | "SYSTEM_ALERT";
  content: string;
  daysAgo: number;
};

type DemoLead = {
  client_name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  physical_address: string;
  lead_source: string;
  service_category: string;
  estimated_revenue: number;
  status: "NEW" | "DISCOVERY" | "QUOTED" | "ACTIVE";
  outcome: "WON" | "LOST" | "ABANDONED" | null;
  actual_revenue: number | null;
  closedDaysAgo: number | null;
  nextActionDays: number; // offset from now; negative = overdue ("Going Cold")
  createdDaysAgo: number;
  is_starred: boolean;
  ai_brief: string | null;
  logs?: DemoLog[];
};

// 20 leads: 16 open (spread across all four statuses, feeding Agenda/Kanban/
// Focus List) + 4 closed (WON/LOST/ABANDONED, visible only in Contacts, per
// the Contacts Directory Scope rule). Deliberately hand-authored rather than
// randomly generated, so the SLA-critical/starred/high-value/ai_brief mix is
// controlled and every view has something real to look at.
export const DEMO_LEADS: DemoLead[] = [
  // ---- NEW (5) ----
  {
    client_name: "Marcus Rivera",
    email: "marcus.rivera@riverstoneroofing.com",
    phone: "(704) 555-0131",
    company: "RiverStone Roofing Co.",
    website: "https://www.riverstoneroofing.com",
    physical_address: "1420 Camden Rd, Charlotte, NC 28203",
    lead_source: "Website Contact Form",
    service_category: "Roofing",
    estimated_revenue: 8200,
    status: "NEW",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: -2,
    createdDaysAgo: 6,
    is_starred: false,
    ai_brief:
      "Storm damage claim on a 12-year-old asphalt shingle roof; insurance adjuster already scheduled. Homeowner wants a second opinion before committing. Time-sensitive — competitor already inspected.",
    logs: [
      {
        log_type: "WEBHOOK",
        daysAgo: 6,
        content: webhookPayload({
          client_name: "Marcus Rivera",
          email: "marcus.rivera@riverstoneroofing.com",
          phone: "(704) 555-0131",
          service_category: "Roofing",
          lead_source: "Website Contact Form",
          message: "Hail damage on the north slope, insurance adjuster coming Thursday. Need a second quote.",
        }),
      },
    ],
  },
  {
    client_name: "Denise Okafor",
    email: "denise.okafor@brightwavesolar.com",
    phone: "(602) 555-0148",
    company: "BrightWave Solar",
    website: "https://www.brightwavesolar.com",
    physical_address: "2210 E Camelback Rd, Phoenix, AZ 85016",
    lead_source: "Google Ads",
    service_category: "Solar Installation",
    estimated_revenue: 24000,
    status: "NEW",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 1,
    createdDaysAgo: 3,
    is_starred: true,
    ai_brief:
      "Whole-home solar quote request; homeowner already has two competing bids in hand and is comparing panel brands and financing terms. High intent, price-sensitive on the loan APR specifically, not the total.",
    logs: [
      {
        log_type: "WEBHOOK",
        daysAgo: 3,
        content: webhookPayload({
          client_name: "Denise Okafor",
          email: "denise.okafor@brightwavesolar.com",
          phone: "(602) 555-0148",
          service_category: "Solar Installation",
          lead_source: "Google Ads",
          message: "Comparing solar quotes, 2400 sq ft home, want financing options included.",
        }),
      },
      {
        log_type: "MANUAL_NOTE",
        daysAgo: 1,
        content: "Sent financing comparison sheet. She's leaning toward us on panel quality — following up Friday.",
      },
    ],
  },
  {
    client_name: "Tyler Brooks",
    email: "tyler.brooks@precisionautodetailing.com",
    phone: "(512) 555-0119",
    company: "Precision Auto Detailing",
    website: "https://www.precisionautodetailing.com",
    physical_address: "804 W Oltorf St, Austin, TX 78704",
    lead_source: "Instagram",
    service_category: "Auto Detailing",
    estimated_revenue: 950,
    status: "NEW",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 2,
    createdDaysAgo: 1,
    is_starred: false,
    ai_brief: null,
  },
  {
    client_name: "Amanda Chu",
    email: "amanda.chu@greenscapelandscaping.com",
    phone: "(503) 555-0167",
    company: "GreenScape Landscaping",
    website: "https://www.greenscapelandscaping.com",
    physical_address: "3390 SE Hawthorne Blvd, Portland, OR 97214",
    lead_source: "Referral",
    service_category: "Landscaping",
    estimated_revenue: 6100,
    status: "NEW",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: -5,
    createdDaysAgo: 14,
    is_starred: false,
    ai_brief:
      "Full backyard xeriscaping redesign referred by an existing client. Has been slow to respond to scheduling texts — worth a phone call instead of another message.",
    logs: [
      {
        log_type: "WEBHOOK",
        daysAgo: 14,
        content: webhookPayload({
          client_name: "Amanda Chu",
          email: "amanda.chu@greenscapelandscaping.com",
          phone: "(503) 555-0167",
          service_category: "Landscaping",
          lead_source: "Referral",
          message: "Referred by the Whitmores on SE Belmont — want a similar xeriscape redesign.",
        }),
      },
    ],
  },
  {
    client_name: "Jordan Whitfield",
    email: "jordan.whitfield@whitfieldplumbing.com",
    phone: "(614) 555-0122",
    company: "Whitfield & Sons Plumbing",
    website: "https://www.whitfieldplumbing.com",
    physical_address: "1188 King Ave, Columbus, OH 43212",
    lead_source: "Yelp",
    service_category: "Plumbing",
    estimated_revenue: 1800,
    status: "NEW",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 3,
    createdDaysAgo: 2,
    is_starred: false,
    ai_brief: null,
  },

  // ---- DISCOVERY (4) ----
  {
    client_name: "Priya Nair",
    email: "priya.nair@summitpeakhvac.com",
    phone: "(720) 555-0154",
    company: "Summit Peak HVAC",
    website: "https://www.summitpeakhvac.com",
    physical_address: "5601 DTC Pkwy, Denver, CO 80111",
    lead_source: "Google Ads",
    service_category: "HVAC",
    estimated_revenue: 12500,
    status: "DISCOVERY",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 1,
    createdDaysAgo: 8,
    is_starred: true,
    ai_brief:
      "Full furnace + AC system replacement for a 3,400 sq ft home ahead of winter. Wants a two-stage system quoted alongside the standard option. Decision-maker is the homeowner directly, no committee.",
    logs: [
      {
        log_type: "WEBHOOK",
        daysAgo: 8,
        content: webhookPayload({
          client_name: "Priya Nair",
          email: "priya.nair@summitpeakhvac.com",
          phone: "(720) 555-0154",
          service_category: "HVAC",
          lead_source: "Google Ads",
          message: "20-year-old furnace, want a full system replacement quote before it gets cold.",
        }),
      },
      {
        log_type: "SYSTEM_ALERT",
        daysAgo: 8,
        content:
          "AI Spam Shield skipped — no Gemini credential configured (org or platform). Lead let through automatically.",
      },
      {
        log_type: "MANUAL_NOTE",
        daysAgo: 4,
        content: "Walked through two-stage vs single-stage options on-site. She wants the two-stage quote written up formally.",
      },
    ],
  },
  {
    client_name: "Carlos Mendoza",
    email: "carlos.mendoza@ironcladpestcontrol.com",
    phone: "(210) 555-0176",
    company: "Ironclad Pest Control",
    website: "https://www.ironcladpestcontrol.com",
    physical_address: "9210 Broadway St, San Antonio, TX 78217",
    lead_source: "Referral",
    service_category: "Pest Control",
    estimated_revenue: 2400,
    status: "DISCOVERY",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: -1,
    createdDaysAgo: 5,
    is_starred: false,
    ai_brief:
      "Recurring quarterly pest control contract for a small strip-mall property, not a single-visit job. Wants pricing for a 4-unit multi-property bundle.",
    logs: [
      {
        log_type: "WEBHOOK",
        daysAgo: 5,
        content: webhookPayload({
          client_name: "Carlos Mendoza",
          email: "carlos.mendoza@ironcladpestcontrol.com",
          phone: "(210) 555-0176",
          service_category: "Pest Control",
          lead_source: "Referral",
          message: "Own 4 small commercial units, want quarterly service pricing for all of them.",
        }),
      },
    ],
  },
  {
    client_name: "Rachel Kim",
    email: "rachel.kim@truelinepainting.com",
    phone: "(919) 555-0143",
    company: "TrueLine Painting Co.",
    website: "https://www.truelinepainting.com",
    physical_address: "4477 Falls of Neuse Rd, Raleigh, NC 27609",
    lead_source: "Facebook Ad",
    service_category: "Painting",
    estimated_revenue: 5300,
    status: "DISCOVERY",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 4,
    createdDaysAgo: 2,
    is_starred: false,
    ai_brief: null,
  },
  {
    client_name: "Devon Marsh",
    email: "devon.marsh@marshelectrical.com",
    phone: "(813) 555-0188",
    company: "Marsh Electrical Services",
    website: "https://www.marshelectrical.com",
    physical_address: "6120 W Kennedy Blvd, Tampa, FL 33609",
    lead_source: "Website Contact Form",
    service_category: "Electrical",
    estimated_revenue: 3600,
    status: "DISCOVERY",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 2,
    createdDaysAgo: 4,
    is_starred: false,
    ai_brief:
      "Panel upgrade from 100A to 200A plus EV charger circuit. Renovation-adjacent job — timeline is flexible but tied to a kitchen remodel finishing in about a month.",
  },

  // ---- QUOTED (4) ----
  {
    client_name: "Stephanie Ortiz",
    email: "stephanie.ortiz@coastalbreezehvac.com",
    phone: "(813) 555-0104",
    company: "Coastal Breeze HVAC",
    website: "https://www.coastalbreezehvac.com",
    physical_address: "2755 Bayshore Blvd, Tampa, FL 33629",
    lead_source: "Google Ads",
    service_category: "HVAC",
    estimated_revenue: 15800,
    status: "QUOTED",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 1,
    createdDaysAgo: 10,
    is_starred: true,
    ai_brief:
      "Formal quote delivered for a dual-zone mini-split install across a home addition. Customer confirmed budget approval internally; just needs a start date that works around a family trip.",
  },
  {
    client_name: "Ben Whitaker",
    email: "ben.whitaker@whitakerroofing.com",
    phone: "(615) 555-0192",
    company: "Whitaker Roofing & Restoration",
    website: "https://www.whitakerroofing.com",
    physical_address: "3005 Charlotte Ave, Nashville, TN 37209",
    lead_source: "Trade Show",
    service_category: "Roofing",
    estimated_revenue: 31500,
    status: "QUOTED",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: -3,
    createdDaysAgo: 21,
    is_starred: true,
    ai_brief:
      "Full tear-off and re-roof on a 4,200 sq ft home, standing-seam metal upgrade from asphalt. Largest active quote in the pipeline — has gone quiet for a week after the formal quote was sent, worth a direct call rather than another email.",
    logs: [
      {
        log_type: "WEBHOOK",
        daysAgo: 21,
        content: webhookPayload({
          client_name: "Ben Whitaker",
          email: "ben.whitaker@whitakerroofing.com",
          phone: "(615) 555-0192",
          service_category: "Roofing",
          lead_source: "Trade Show",
          message: "Met at the home show, interested in metal roofing for full re-roof.",
        }),
      },
      {
        log_type: "MANUAL_NOTE",
        daysAgo: 15,
        content: "On-site measurement done. Walked him through standing-seam vs architectural shingle pricing.",
      },
      {
        log_type: "MANUAL_NOTE",
        daysAgo: 9,
        content: "Sent formal quote for standing-seam metal, $31,500. He said he needed to run it by his wife.",
      },
    ],
  },
  {
    client_name: "Natalie Foster",
    email: "natalie.foster@shinerightautospa.com",
    phone: "(512) 555-0157",
    company: "ShineRight Auto Spa",
    website: "https://www.shinerightautospa.com",
    physical_address: "1122 S Lamar Blvd, Austin, TX 78704",
    lead_source: "Instagram",
    service_category: "Auto Detailing",
    estimated_revenue: 1200,
    status: "QUOTED",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 5,
    createdDaysAgo: 3,
    is_starred: false,
    ai_brief: null,
  },
  {
    client_name: "Omar Haddad",
    email: "omar.haddad@haddadlandscapedesign.com",
    phone: "(720) 555-0139",
    company: "Haddad Landscape Design",
    website: "https://www.haddadlandscapedesign.com",
    physical_address: "7710 E Hampden Ave, Denver, CO 80231",
    lead_source: "Referral",
    service_category: "Landscaping",
    estimated_revenue: 9400,
    status: "QUOTED",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 2,
    createdDaysAgo: 7,
    is_starred: false,
    ai_brief:
      "Front-yard hardscape and paver patio quote sent. Comparing against one other local contractor; price is close, differentiator is the proposed timeline.",
  },

  // ---- ACTIVE (3) ----
  {
    client_name: "Lauren Pierce",
    email: "lauren.pierce@piercepressurewashing.com",
    phone: "(704) 555-0165",
    company: "Pierce Pressure Washing",
    website: "https://www.piercepressurewashing.com",
    physical_address: "8802 Pineville-Matthews Rd, Charlotte, NC 28226",
    lead_source: "Website Contact Form",
    service_category: "Pressure Washing",
    estimated_revenue: 1100,
    status: "ACTIVE",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 3,
    createdDaysAgo: 4,
    is_starred: false,
    ai_brief: null,
  },
  {
    client_name: "Greg Sutton",
    email: "greg.sutton@suttonbrosplumbing.com",
    phone: "(614) 555-0111",
    company: "Sutton Bros. Plumbing",
    website: "https://www.suttonbrosplumbing.com",
    physical_address: "2245 N High St, Columbus, OH 43201",
    lead_source: "Yelp",
    service_category: "Plumbing",
    estimated_revenue: 4200,
    status: "ACTIVE",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: 1,
    createdDaysAgo: 11,
    is_starred: false,
    ai_brief:
      "Repiping job in progress — job accepted, scheduled for next week. Just confirming final material order (PEX vs copper) before crew shows up.",
  },
  {
    client_name: "Melissa Trent",
    email: "melissa.trent@trentfamilyhvac.com",
    phone: "(602) 555-0128",
    company: "Trent Family HVAC",
    website: "https://www.trentfamilyhvac.com",
    physical_address: "4410 N 24th St, Phoenix, AZ 85016",
    lead_source: "Google Ads",
    service_category: "HVAC",
    estimated_revenue: 18700,
    status: "ACTIVE",
    outcome: null,
    actual_revenue: null,
    closedDaysAgo: null,
    nextActionDays: -4,
    createdDaysAgo: 18,
    is_starred: true,
    ai_brief:
      "Commercial rooftop unit replacement for a small retail plaza, job accepted and materials ordered. Slipped past its last check-in date waiting on the equipment delivery — worth confirming the new ETA directly with the supplier, not just the customer.",
    logs: [
      {
        log_type: "WEBHOOK",
        daysAgo: 18,
        content: webhookPayload({
          client_name: "Melissa Trent",
          email: "melissa.trent@trentfamilyhvac.com",
          phone: "(602) 555-0128",
          service_category: "HVAC",
          lead_source: "Google Ads",
          message: "Rooftop unit down at our retail plaza, need a replacement quoted ASAP.",
        }),
      },
      {
        log_type: "SYSTEM_ALERT",
        daysAgo: 18,
        content:
          "AI Spam Shield skipped — no Gemini credential configured (org or platform). Lead let through automatically.",
      },
      {
        log_type: "MANUAL_NOTE",
        daysAgo: 10,
        content: "Job accepted, deposit collected. Equipment on backorder — supplier now quoting a 2-week delay.",
      },
    ],
  },

  // ---- WON (2) ----
  {
    client_name: "Diane Castillo",
    email: "diane.castillo@castilloroofinggroup.com",
    phone: "(919) 555-0173",
    company: "Castillo Roofing Group",
    website: "https://www.castilloroofinggroup.com",
    physical_address: "6501 Creedmoor Rd, Raleigh, NC 27613",
    lead_source: "Trade Show",
    service_category: "Roofing",
    estimated_revenue: 22000,
    status: "ACTIVE",
    outcome: "WON",
    actual_revenue: 23500,
    closedDaysAgo: -10,
    nextActionDays: 30,
    createdDaysAgo: 45,
    is_starred: false,
    ai_brief:
      "Full roof replacement, closed above the original estimate after the customer added gutter guards to the scope.",
    logs: [
      {
        log_type: "WEBHOOK",
        daysAgo: 45,
        content: webhookPayload({
          client_name: "Diane Castillo",
          email: "diane.castillo@castilloroofinggroup.com",
          phone: "(919) 555-0173",
          service_category: "Roofing",
          lead_source: "Trade Show",
          message: "Aging roof, want a full replacement quote before next storm season.",
        }),
      },
      {
        log_type: "MANUAL_NOTE",
        daysAgo: 30,
        content: "Sent quote, she asked about adding gutter guards to the scope.",
      },
      {
        log_type: "MANUAL_NOTE",
        daysAgo: 10,
        content: "Deal closed! Signed contract for full roof replacement plus gutter guards, $23,500 total.",
      },
    ],
  },
  {
    client_name: "Frank Dellucci",
    email: "frank.dellucci@delluccilandscaping.com",
    phone: "(503) 555-0184",
    company: "Dellucci Landscaping",
    website: "https://www.delluccilandscaping.com",
    physical_address: "9944 SW Barbur Blvd, Portland, OR 97219",
    lead_source: "Referral",
    service_category: "Landscaping",
    estimated_revenue: 7300,
    status: "QUOTED",
    outcome: "WON",
    actual_revenue: 6800,
    closedDaysAgo: -20,
    nextActionDays: 30,
    createdDaysAgo: 50,
    is_starred: false,
    ai_brief: "Backyard patio and irrigation project, closed slightly under estimate after simplifying the irrigation zone count.",
  },

  // ---- LOST (1) ----
  {
    client_name: "Yolanda Briggs",
    email: "yolanda.briggs@briggshomesolar.com",
    phone: "(210) 555-0161",
    company: "Briggs Home Solar",
    website: "https://www.briggshomesolar.com",
    physical_address: "11340 W Loop 1604 N, San Antonio, TX 78254",
    lead_source: "Google Ads",
    service_category: "Solar Installation",
    estimated_revenue: 26000,
    status: "QUOTED",
    outcome: "LOST",
    actual_revenue: null,
    closedDaysAgo: -15,
    nextActionDays: 30,
    createdDaysAgo: 40,
    is_starred: false,
    ai_brief:
      "Lost to a competitor offering a 0% financing promotion we couldn't match. Worth re-approaching if our financing terms change.",
    logs: [
      {
        log_type: "WEBHOOK",
        daysAgo: 40,
        content: webhookPayload({
          client_name: "Yolanda Briggs",
          email: "yolanda.briggs@briggshomesolar.com",
          phone: "(210) 555-0161",
          service_category: "Solar Installation",
          lead_source: "Google Ads",
          message: "Getting quotes for solar, comparing financing options.",
        }),
      },
      {
        log_type: "MANUAL_NOTE",
        daysAgo: 15,
        content: "Went with a competitor offering 0% financing we couldn't match. Politely declined our follow-up quote.",
      },
    ],
  },

  // ---- ABANDONED (1) ----
  {
    client_name: "Kevin Alcaraz",
    email: "kevin.alcaraz@alcarazautodetailing.com",
    phone: "(615) 555-0146",
    company: "Alcaraz Auto Detailing",
    website: "https://www.alcarazautodetailing.com",
    physical_address: "4488 Nolensville Pike, Nashville, TN 37211",
    lead_source: "Instagram",
    service_category: "Auto Detailing",
    estimated_revenue: 1500,
    status: "NEW",
    outcome: "ABANDONED",
    actual_revenue: null,
    closedDaysAgo: -30,
    nextActionDays: 30,
    createdDaysAgo: 35,
    is_starred: false,
    ai_brief: null,
  },
];

export async function seedDemoLeads(orgId: string): Promise<{ leadCount: number; logCount: number }> {
  const admin = createAdminClient();
  let leadCount = 0;
  let logCount = 0;

  for (const def of DEMO_LEADS) {
    const { logs, closedDaysAgo, nextActionDays, createdDaysAgo, ...rest } = def;

    const { data: lead, error } = await admin
      .from("leads")
      .insert({
        organization_id: orgId,
        ...rest,
        closed_at: closedDaysAgo !== null ? daysFromNow(closedDaysAgo) : null,
        next_action_at: daysFromNow(nextActionDays),
        created_at: daysFromNow(-createdDaysAgo),
      })
      .select("id")
      .single();

    if (error || !lead) {
      throw new Error(
        `Failed to insert demo lead "${def.client_name}" (${def.company}): ${error?.message ?? "no row returned"}`,
      );
    }

    leadCount += 1;

    // Every lead carries at least one lead_submissions row whatever created
    // it — the demo org included, or the profile sheet's enquiry history would
    // render empty across all 20 seeded leads and look broken rather than
    // seeded. Written inline with the admin client for the same reason the
    // activity_logs insert below is: this script imports relatively and does
    // not resolve the app's "@/" alias.
    const { error: submissionError } = await admin.from("lead_submissions").insert({
      lead_id: lead.id,
      organization_id: orgId,
      client_name: def.client_name,
      email: def.email,
      phone: def.phone,
      company: def.company,
      message: webhookMessageOf(logs),
      service_category: def.service_category,
      lead_source: def.lead_source,
      created_at: daysFromNow(-createdDaysAgo),
    });

    if (submissionError) {
      throw new Error(
        `Failed to insert demo submission for "${def.client_name}": ${submissionError.message}`,
      );
    }

    if (logs?.length) {
      const rows = logs.map((log) => ({
        lead_id: lead.id,
        organization_id: orgId,
        log_type: log.log_type,
        content: log.content,
        created_at: daysFromNow(-log.daysAgo),
      }));

      const { error: logError } = await admin.from("activity_logs").insert(rows);
      if (logError) {
        throw new Error(`Failed to insert activity logs for "${def.client_name}": ${logError.message}`);
      }
      logCount += rows.length;
    }
  }

  return { leadCount, logCount };
}

export async function countDemoLeads(orgId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (error) {
    throw new Error(`Failed to count demo leads: ${error.message}`);
  }

  return count ?? 0;
}

// Deletes every lead in the given org. activity_logs.lead_id and
// lead_submissions.lead_id both have ON DELETE CASCADE, so those rows are
// removed automatically — no separate delete.
export async function wipeDemoLeads(orgId: string): Promise<number> {
  const admin = createAdminClient();

  // Hard safety check, right before the destructive call, independent of
  // whatever the caller believes orgId is: refuse to wipe anything unless
  // this id genuinely resolves to the demo org by name.
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (orgError || !org) {
    throw new Error(`Refusing to wipe: could not verify org ${orgId} (${orgError?.message ?? "not found"})`);
  }
  if (org.name !== DEMO_ORG_NAME) {
    throw new Error(
      `Refusing to wipe: org ${orgId} is named "${org.name}", not "${DEMO_ORG_NAME}". Aborting to protect real data.`,
    );
  }

  const existingCount = await countDemoLeads(orgId);
  if (existingCount === 0) {
    return 0;
  }

  const { error: deleteError } = await admin.from("leads").delete().eq("organization_id", orgId);
  if (deleteError) {
    throw new Error(`Failed to delete demo leads: ${deleteError.message}`);
  }

  return existingCount;
}
