import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";

const GRAPH_URL = "https://graph.microsoft.com/v1.0";

async function getGraphEvents(accessToken: string) {
  const now = new Date().toISOString();
  const twoMonths = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const response = await axios.get(
    `${GRAPH_URL}/me/calendarView?startDateTime=${now}&endDateTime=${twoMonths}&$select=subject,start,end,bodyPreview,webLink&$orderby=start/dateTime&$top=50`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const events = response.data.value || [];
  return events.map((ev: any) => ({
    id: `ms-${ev.id?.slice(0, 16) || Math.random()}`,
    title: ev.subject || "Untitled",
    date: ev.start?.dateTime || "",
    course: "",
    url: ev.webLink || "",
    type: "calendar",
    approved: false,
    description: ev.bodyPreview || "",
  }));
}

async function getGraphTasks(accessToken: string) {
  try {
    const response = await axios.get(
      `${GRAPH_URL}/me/todo/lists`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const lists = response.data.value || [];
    const items: any[] = [];

    for (const list of lists.slice(0, 5)) {
      const tasks = await axios.get(
        `${GRAPH_URL}/me/todo/lists/${list.id}/tasks?$filter=status ne 'completed'&$top=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      for (const task of tasks.data.value || []) {
        items.push({
          id: `task-${task.id?.slice(0, 16)}`,
          title: task.title,
          date: task.dueDateTime?.dateTime || "",
          course: list.displayName || "",
          type: "task",
          approved: false,
        });
      }
    }

    return items;
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated", events: [] }, { status: 401 });
  }

  try {
    const [calEvents, tasks] = await Promise.all([
      getGraphEvents(session.accessToken),
      getGraphTasks(session.accessToken),
    ]);

    const allEvents = [...calEvents, ...tasks];
    return NextResponse.json({ events: allEvents, count: allEvents.length });
  } catch (error: any) {
    console.error("Graph API error:", error.response?.data || error.message);
    return NextResponse.json(
      { error: error.message, events: [] },
      { status: 500 }
    );
  }
}
