import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = readDb();
    const camp = db.campaigns.find((c) => c.id === id);

    if (!camp) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (body.status) {
      camp.status = body.status;
      if (body.status === "APPROVED" || body.status === "LIVE") {
        camp.approvedAt = new Date().toISOString();
        camp.reviewedBy = body.reviewedBy || "Operator";
      }
    }
    if (body.sponsorName) camp.sponsorName = body.sponsorName;
    if (body.objectName) camp.objectName = body.objectName;
    if (body.dropItemName) camp.dropItemName = body.dropItemName;
    if (body.ctaLabel) camp.ctaLabel = body.ctaLabel;
    if (body.ctaUrl) camp.ctaUrl = body.ctaUrl;

    writeDb(db);
    return NextResponse.json({ campaign: camp });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

