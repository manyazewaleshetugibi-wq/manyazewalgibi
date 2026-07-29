import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function getStationForCategory(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower === "coffee") return "COFFEE_MAKER";
  if (lower === "food" || lower === "staff foods" || lower === "books") return "ALL";
  return "BARISTA";
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    const categories = await db.collection("itemCategories").find({}).toArray();

    const updates: { name: string; oldStation: string; newStation: string }[] = [];

    for (const cat of categories) {
      const newStation = getStationForCategory(cat.name);
      if (cat.station !== newStation) {
        await db.collection("itemCategories").updateOne(
          { _id: cat._id },
          { $set: { station: newStation, updatedAt: new Date() } }
        );
        updates.push({ name: cat.name, oldStation: cat.station || "ALL", newStation });
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
