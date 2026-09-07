import { NextResponse } from "next/server";

interface ParsedEvent {
  id: string;
  title: string;
  date: string;
  course: string;
  description: string;
  type: string;
  approved: boolean;
}

function extractCourse(text: string): string {
  const m = text.match(/\(([A-Z]+-\d+-\w+)\)/);
  return m ? m[1] : "";
}

function parseDate(dateStr: string, year = 2026): string | null {
  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
  };

  // Match patterns like "10/1", "October 1", "10/22 @1005am"
  const patterns = [
    /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*(?:@\s*(\d{2})(\d{2})(?:am|pm)?)?/i,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:@\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?)?/i,
  ];

  for (const pat of patterns) {
    const m = dateStr.match(pat);
    if (!m) continue;

    let month: string, day: string, hour = "09", min = "00";

    if (m[0].match(/^\d/)) {
      month = m[1].padStart(2, "0");
      day = m[2].padStart(2, "0");
      if (m[4] && m[5]) {
        hour = m[4].padStart(2, "0");
        min = m[5].padStart(2, "0");
      }
    } else {
      month = months[m[1].toLowerCase()] || "01";
      day = m[2].padStart(2, "0");
      if (m[3]) {
        let h = parseInt(m[3]);
        if (m[5]?.toLowerCase() === "pm" && h < 12) h += 12;
        hour = h.toString().padStart(2, "0");
        min = (m[4] || "00").padStart(2, "0");
      }
    }

    return `${year}-${month}-${day}T${hour}:${min}:00`;
  }

  return null;
}

export async function POST(request: Request) {
  const { text, courseName } = await request.json();
  const events: ParsedEvent[] = [];

  const course = courseName || extractCourse(text) || "Unknown Course";

  // Patterns to find deadlines/due dates/exams
  const duePhrases = [
    /due[:\s]+([^\n.]+)/gi,
    /exam\s+\d[^.\n]*/gi,
    /quiz[^.\n]*/gi,
    /(?:assignment|project|presentation)[^.\n]*/gi,
    /(?:case study|midterm|final)[^.\n]*/gi,
  ];

  const seen = new Set<string>();

  // Split into lines and look for date mentions
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty, navigation, or schedule header lines
    if (line.trim().length < 5) continue;
    if (/tuesdays?\s*(&|and)\s*thursdays?/i.test(line)) continue;
    if (/class\s+(mtg|meeting|schedule)/i.test(line)) continue;
    if (/office\s+hours/i.test(line)) continue;
    if (/^\s*(week\s+\d+\s*[.:]?\s*)?[\d\/]+\s*(&\s*[\d\/]+)?\s*\.?\s*$/i.test(line)) continue;

    // Look for date patterns in line
    const datePatterns = [
      /\b(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s*(?:@|at)?\s*(\d{4}(?:am|pm)?|\d{1,2}:\d{2}\s*(?:am|pm)?)?/i,
      /\b((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?)\b/i,
    ];

    let foundDate: string | null = null;
    for (const pat of datePatterns) {
      const m = line.match(pat);
      if (m) {
        foundDate = parseDate(m[0]);
        break;
      }
    }

    if (!foundDate) continue;

    // Extract title from surrounding context
    let title = line
      .replace(/week\s+\d+\.\s+/gi, "")
      .replace(/\d{1,2}\/\d{1,2}(?:\s*&\s*\d{1,2}\/\d{1,2})?/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (title.length < 4) {
      // Pull from surrounding lines
      title = lines.slice(Math.max(0, i - 1), i + 2)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);
    }

    // Determine type
    let type = "event";
    const lower = title.toLowerCase();
    if (lower.includes("exam")) type = "exam";
    else if (lower.includes("quiz")) type = "quiz";
    else if (lower.includes("due") || lower.includes("submission") || lower.includes("assignment")) type = "assignment";
    else if (lower.includes("presentation")) type = "presentation";
    else if (lower.includes("class") || lower.includes("lecture") || lower.includes("meeting")) type = "class";

    const key = `${title}-${foundDate}`;
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      id: `parsed-${Buffer.from(key).toString("base64").slice(0, 16)}`,
      title: title.slice(0, 120),
      date: foundDate,
      course,
      description: line.trim(),
      type,
      approved: false,
    });
  }

  return NextResponse.json({ events, count: events.length });
}
