import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

function getStationForCategory(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower === "coffee") return "COFFEE_MAKER";
  if (lower === "food" || lower === "staff foods" || lower === "books") return "ALL";
  return "BARISTA";
}

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const categories = await prisma.itemCategory.findMany();

    const updates: { name: string; oldStation: string; newStation: string }[] = [];

    for (const cat of categories) {
      const newStation = getStationForCategory(cat.name || "");
      if ((cat as any).station !== newStation) {
        updates.push({ name: cat.name || "", oldStation: (cat as any).station || "ALL", newStation });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} categories`,
      updates,
      allCategories: categories.map((c: any) => ({
        name: c.name,
        station: getStationForCategory(c.name),
      })),
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ success: false, error: "Migration failed" }, { status: 500 });
  }
}
