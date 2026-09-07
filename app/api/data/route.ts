import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

const EVENTS_KEY = "alex:events";
const COMPLETED_KEY = "alex:completed";

export async function GET() {
  try {
    const events = await kv.get(EVENTS_KEY) || [];
    const completed = await kv.get(COMPLETED_KEY) || [];
    return NextResponse.json({ events, completed });
  } catch (e: any) {
    return NextResponse.json({ events: [], completed: [], error: e.message });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.events !== undefined) {
      await kv.set(EVENTS_KEY, body.events);
    }
    if (body.completed !== undefined) {
      await kv.set(COMPLETED_KEY, body.completed);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
