/**
 * app/api/reports/route.ts
 *
 * GET /api/reports?type=daily-sales|unpaid|credit|riders&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns report data as JSON. The UI uses this for table rendering and CSV export.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDailySalesReport,
  getUnpaidOrdersReport,
  getCreditLedgerReport,
  getRiderPerformanceReport,
} from "@/lib/reporting/report-service";
import { requireRole, badRequest, serverError } from "@/lib/auth/api-auth";
import type { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("ADMIN" as UserRole, "SUPER_ADMIN" as UserRole);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = toStr ? new Date(`${toStr}T23:59:59`) : new Date();

  try {
    switch (type) {
      case "daily-sales": {
        const data = await getDailySalesReport({ from, to });
        return NextResponse.json({ type, data });
      }
      case "unpaid": {
        const data = await getUnpaidOrdersReport();
        return NextResponse.json({ type, data });
      }
      case "credit": {
        const data = await getCreditLedgerReport();
        return NextResponse.json({ type, data });
      }
      case "riders": {
        const data = await getRiderPerformanceReport({ from, to });
        return NextResponse.json({ type, data });
      }
      default:
        return badRequest("Invalid report type. Use: daily-sales, unpaid, credit, or riders.");
    }
  } catch (err) {
    console.error("[GET /api/reports]", err);
    return serverError();
  }
}
