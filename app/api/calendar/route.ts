import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { authOptions } from "../auth/[...nextauth]/route";

async function getAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return null;
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: session.accessToken as string });
  return auth;
}

export async function GET() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();
  const sixMonths = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: sixMonths.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  return NextResponse.json(response.data.items || []);
}

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const calendar = google.calendar({ version: "v3", auth });
  const body = await request.json();
  const { title, startDate, endDate, description } = body;

  // Duplicate check
  const dayStart = new Date(startDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(startDate);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await calendar.events.list({
    calendarId: "primary",
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    q: title,
    singleEvents: true,
  });

  const duplicate = existing.data.items?.find(
    (e) => e.summary?.toLowerCase() === title.toLowerCase()
  );

  if (duplicate) {
    return NextResponse.json({ ok: true, skipped: true, id: duplicate.id });
  }

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: title,
      description: description || "",
      start: { dateTime: startDate, timeZone: "America/New_York" },
      end: { dateTime: endDate || startDate, timeZone: "America/New_York" },
      colorId: "6",
    },
  });

  return NextResponse.json(event.data);
}
