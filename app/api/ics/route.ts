import { NextResponse } from "next/server";

function parseICS(content: string) {
  const events: any[] = [];
  const blocks = content.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

  for (const block of blocks) {
    const get = (field: string) => {
      const m = block.match(new RegExp(`${field}:([\\s\\S]*?)(?:\\n[A-Z]|$)`));
      return m ? m[1].replace(/\s+/g, " ").trim() : "";
    };

    const title = get("SUMMARY").replace(/&amp;/g, "&").replace(/\\,/g, ",");
    const desc = get("DESCRIPTION")
      .replace(/\\n/g, "\n")
      .replace(/\\,/g, ",")
      .trim();
    const dtstart = get("DTSTART");
    const category = get("CATEGORIES").replace(/\\,/g, ",");
    const url = get("URL").replace(/\\/g, "");

    let isoDate = "";
    if (dtstart && dtstart.includes("T")) {
      const y = dtstart.slice(0, 4);
      const mo = dtstart.slice(4, 6);
      const d = dtstart.slice(6, 8);
      const h = dtstart.slice(9, 11);
      const mi = dtstart.slice(11, 13);
      isoDate = `${y}-${mo}-${d}T${h}:${mi}:00Z`;
    }

    if (title) {
      events.push({
        id: `ics-${Buffer.from(title + dtstart).toString("base64").slice(0, 16)}`,
        title,
        description: desc,
        date: isoDate,
        course: category,
        url,
        type: "assignment",
        approved: false,
      });
    }
  }

  return events;
}

export async function POST(request: Request) {
  const body = await request.text();
  const events = parseICS(body);
  return NextResponse.json({ events, count: events.length });
}
