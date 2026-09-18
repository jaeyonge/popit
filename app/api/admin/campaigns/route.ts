import { NextResponse } from "next/server";
import { readDb, writeDb, DailyCampaign } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDb();
  return NextResponse.json({ campaigns: db.campaigns });
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Partial<DailyCampaign>;
    if (!data.sponsorName || !data.objectName || !data.date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newCampaign: DailyCampaign = {
      id: "camp_" + Date.now(),
      date: data.date,
      sponsorName: data.sponsorName,
      objectName: data.objectName,
      objectAssetUrl: data.objectAssetUrl || "/assets/oreo_box.png",
      dropItemName: data.dropItemName || "아이템",
      dropAssetUrl: data.dropAssetUrl || "/assets/oreo_cookie.png",
      ctaLabel: data.ctaLabel || "자세히 보기",
      ctaUrl: data.ctaUrl || "#",
      campaignType: data.campaignType || "SPONSORED",
      status: "DRAFT",
    };

    const db = readDb();
    db.campaigns.unshift(newCampaign);
    writeDb(db);

    return NextResponse.json({ campaign: newCampaign });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}

