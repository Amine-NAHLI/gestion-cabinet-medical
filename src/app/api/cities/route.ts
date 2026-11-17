import { NextResponse } from "next/server";
import { searchMoroccanCities, MOROCCAN_CITIES } from "@/lib/moroccanCities";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const results = searchMoroccanCities(query);

    return NextResponse.json({
      success: true,
      count: results.length,
      total: MOROCCAN_CITIES.length,
      cities: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erreur de chargement des villes" },
      { status: 500 }
    );
  }
}
