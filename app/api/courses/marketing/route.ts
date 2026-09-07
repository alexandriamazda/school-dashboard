import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DOWNLOADS = process.env.HOME + "/Downloads";
const COURSE = "Marketing Principles (MGMT-205-TRA01)";

function extractTextFromDocx(filePath: string): string {
  try {
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(filePath);
    const xml = zip.readAsText("word/document.xml");
    return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function parseDate(str: string, year = 2026): string | null {
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  const m = str.match(/(\d{1,2})\/(\d{1,2})(?:\s*[@at]+\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?)?/i);
  if (m) {
    const mo = m[1].padStart(2, "0");
    const d = m[2].padStart(2, "0");
    let h = m[3] ? parseInt(m[3]) : 9;
    const mi = m[4] || "00";
    if (m[5]?.toLowerCase() === "pm" && h < 12) h += 12;
    return `${year}-${mo}-${d}T${h.toString().padStart(2, "0")}:${mi}:00`;
  }
  return null;
}

export async function GET() {
  // Return pre-built marketing events
  const events = [];

  const course = COURSE;

  // Key events
  const keyEvents = [
    { id: "mkt-quiz1", title: "Case Quiz #1 - Chick-fil-A Case Study", date: "2026-10-01T10:05:00", type: "quiz", description: "2-page requirement. Q1: Needs/wants/demands of Chick-fil-A customers. Q2: What value does Chick-fil-A provide?" },
    { id: "mkt-proj-meeting1", title: "Marketing Project — Team Formation", date: "2026-10-01T08:45:00", type: "class", description: "In-class team formation and presentation schedule." },
    { id: "mkt-proj-meeting2", title: "Marketing Project — Team Meeting", date: "2026-10-20T08:45:00", type: "class", description: "Tuesday in-class team meeting." },
    { id: "mkt-exam1", title: "Marketing Exam #1", date: "2026-10-22T10:05:00", type: "exam", description: "4 questions, 1 page each. Topics: differentiation strategy, focus groups, social media marketing, market segmentation." },
    { id: "mkt-quiz2", title: "Marketing Mix Quiz #2", date: "2026-11-19T10:05:00", type: "quiz", description: "2-page requirement." },
    { id: "mkt-pres1", title: "Team Marketing Project Presentations", date: "2026-12-01T08:45:00", type: "presentation", description: "Presentations begin Tuesday 12/1." },
    { id: "mkt-pres2", title: "Team Marketing Project Presentations", date: "2026-12-03T08:45:00", type: "presentation", description: "Presentations continue Thursday 12/3." },
    { id: "mkt-pres3", title: "Team Marketing Project Presentations (as needed)", date: "2026-12-08T08:45:00", type: "presentation", description: "Overflow presentations 12/8–12/10." },
    { id: "mkt-exam2", title: "Marketing Exam #2", date: "2026-12-15T10:05:00", type: "exam", description: "4 questions, 1 page each. Topics: IoT products, store brands, product placement, mobile apps." },
  ];

  for (const e of keyEvents) {
    events.push({ ...e, course, approved: false });
  }

  // Class sessions Tue/Thu 8:45am Sep 8 – Dec 15
  const start = new Date("2026-09-08");
  const end = new Date("2026-12-15");
  const thanksgiving = new Date("2026-11-26");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if ((d.getDay() === 2 || d.getDay() === 4) && d.getTime() !== thanksgiving.getTime()) {
      const ds = d.toISOString().slice(0, 10);
      events.push({
        id: `mkt-class-${ds}`,
        title: "Marketing Principles — Class",
        date: `${ds}T08:45:00`,
        course,
        description: "Roth Hall S436, 8:45–10:05am. Prof. Anthony Chando.",
        type: "class",
        approved: false,
      });
    }
  }

  return NextResponse.json({ events, count: events.length });
}
