import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const DOWNLOADS = process.env.HOME + "/Downloads";

function extractDocxText(filePath: string): string {
  try {
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(filePath);
    const xml = zip.readAsText("word/document.xml");
    return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } catch { return ""; }
}

function extractPdfText(filePath: string): string {
  try {
    const result = execSync(`strings "${filePath}" 2>/dev/null | head -200`, { timeout: 5000 });
    return result.toString().replace(/\s+/g, " ").trim();
  } catch { return ""; }
}

function parseDate(str: string, year = 2026): string | null {
  const m = str.match(/(\d{1,2})\/(\d{1,2})(?:\s*[@at]+\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?)?/i);
  if (!m) return null;
  const mo = m[1].padStart(2, "0");
  const d = m[2].padStart(2, "0");
  let h = m[3] ? parseInt(m[3]) : 9;
  const mi = m[4] || "00";
  if (m[5]?.toLowerCase() === "pm" && h < 12) h += 12;
  return `${year}-${mo}-${d}T${h.toString().padStart(2, "0")}:${mi}:00`;
}

function parseEventsFromText(text: string, courseName: string, files: string[]) {
  const events: any[] = [];
  const lines = text.split(/[\n\r]+/);
  const seen = new Set<string>();

  const skipPatterns = [
    /tuesdays?\s*(&|and)\s*thursdays?/i,
    /class\s+(mtg|meeting|schedule)/i,
    /office\s+hours/i,
    /^\s*week\s+\d+/i,
    /chapter\s+\d+/i,
    /class\s+lecture/i,
  ];

  for (const line of lines) {
    if (line.trim().length < 8) continue;
    if (skipPatterns.some((p) => p.test(line))) continue;

    const dateMatch = line.match(/(\d{1,2})\/(\d{1,2})(?:\s*[@at]+\s*(\d{2})(\d{2})(?:am|pm)?)?/i);
    if (!dateMatch) continue;

    const isoDate = parseDate(dateMatch[0]);
    if (!isoDate) continue;

    let title = line
      .replace(/\d{1,2}\/\d{1,2}/g, "")
      .replace(/@\s*\d+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (title.length < 4) continue;

    let type = "event";
    const lower = title.toLowerCase();
    if (lower.includes("exam")) type = "exam";
    else if (lower.includes("quiz")) type = "quiz";
    else if (lower.includes("due") || lower.includes("submission") || lower.includes("assignment")) type = "assignment";
    else if (lower.includes("presentation")) type = "presentation";

    const key = `${title.slice(0, 30)}-${isoDate.slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Find relevant documents
    const attachments = files.filter((f) => {
      const fl = f.toLowerCase();
      const tl = lower;
      if (tl.includes("exam 1") && fl.includes("exam 1")) return true;
      if (tl.includes("exam 2") && fl.includes("exam 2")) return true;
      if (tl.includes("quiz") && (fl.includes("quiz") || fl.includes("question"))) return true;
      if (tl.includes("chick") && fl.includes("chick")) return true;
      return false;
    });

    events.push({
      id: `course-${Buffer.from(key).toString("base64").slice(0, 16)}`,
      title: title.slice(0, 120),
      date: isoDate,
      course: courseName,
      type,
      approved: false,
      attachments,
    });
  }

  return events;
}

export async function POST(request: Request) {
  const { folderPath, courseName } = await request.json();

  const fullPath = folderPath.startsWith("/") ? folderPath : path.join(DOWNLOADS, folderPath);

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: `Folder not found: ${fullPath}`, events: [] }, { status: 404 });
  }

  const files = fs.readdirSync(fullPath).filter((f) => !f.startsWith("."));
  const filePaths = files.map((f) => path.join(fullPath, f));

  // Extract text from all docs in folder
  let allText = "";
  for (const fp of filePaths) {
    const ext = path.extname(fp).toLowerCase();
    if (ext === ".docx" || ext === ".doc") {
      allText += "\n" + extractDocxText(fp);
    } else if (ext === ".pdf") {
      allText += "\n" + extractPdfText(fp);
    }
  }

  const events = parseEventsFromText(allText, courseName || path.basename(fullPath), files);

  return NextResponse.json({
    events,
    count: events.length,
    files,
    folderPath: fullPath,
  });
}
