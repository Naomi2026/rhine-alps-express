/**
 * app/(admin)/admin/reports/page.tsx
 *
 * Report viewer: daily sales, unpaid orders, credit ledger, rider performance.
 * Supports CSV export for each report type (§23).
 */

import { requireAdminSession } from "@/lib/auth/session";
import {
  getDailySalesReport,
  getUnpaidOrdersReport,
  getCreditLedgerReport,
  getRiderPerformanceReport,
} from "@/lib/reporting/report-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKES } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { ExportButton } from "./export-button";

export const dynamic = "force-dynamic";

interface SearchParams {
  from?: string;
  to?: string;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminSession();
  const params = await searchParams;

  const from = params.from
    ? new Date(params.from)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = params.to ? new Date(`${params.to}T23:59:59`) : new Date();

  const [dailySales, unpaid, creditLedger, riderPerf] = await Promise.all([
    getDailySalesReport({ from, to }),
    getUnpaidOrdersReport(),
    getCreditLedgerReport(),
    getRiderPerformanceReport({ from, to }),
  ]);

  const totalRevenue = dailySales.reduce((s, r) => s + r.totalRevenue, 0);
  const totalCompleted = dailySales.reduce((s, r) => s + r.completedOrders, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Reports"
        description="Operational reporting and data export"
      />

      {/* Date filter */}
      <form className="flex flex-wrap gap-3" method="GET">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from.toISOString().split("T")[0]}
            className="rounded border border-input px-2 py-1 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to.toISOString().split("T")[0]}
            className="rounded border border-input px-2 py-1 text-xs"
          />
        </div>
        <button
          type="submit"
          className="rounded border border-input bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
        >
          Apply
        </button>
      </form>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-muted-foreground">Completed Orders</p>
            <p className="text-2xl font-bold">{totalCompleted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatKES(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-muted-foreground">Unpaid Orders</p>
            <p className="text-2xl font-bold text-amber-700">{unpaid.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-muted-foreground">Riders</p>
            <p className="text-2xl font-bold">{riderPerf.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="flex-wrap">
          <TabsTrigger value="daily">Daily Sales</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid Orders</TabsTrigger>
          <TabsTrigger value="credit">Credit Ledger</TabsTrigger>
          <TabsTrigger value="riders">Rider Performance</TabsTrigger>
        </TabsList>

        {/* Daily sales */}
        <TabsContent value="daily">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
              <ExportButton type="daily-sales" from={from.toISOString().split("T")[0]} to={to.toISOString().split("T")[0]} />
            </CardHeader>
            <CardContent className="p-0">
              {dailySales.length === 0 ? (
                <div className="p-4"><EmptyState title="No completed orders in this date range" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Orders</TableHead>
                        <TableHead className="text-xs">Revenue</TableHead>
                        <TableHead className="text-xs">Delivery Fees</TableHead>
                        <TableHead className="text-xs">Band 1</TableHead>
                        <TableHead className="text-xs">Band 2</TableHead>
                        <TableHead className="text-xs">Band 3</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailySales.map((row) => (
                        <TableRow key={row.date}>
                          <TableCell className="text-sm">{row.date}</TableCell>
                          <TableCell className="text-sm">{row.completedOrders}</TableCell>
                          <TableCell className="text-sm font-medium">{formatKES(row.totalRevenue)}</TableCell>
                          <TableCell className="text-sm">{formatKES(row.totalDeliveryFees)}</TableCell>
                          <TableCell className="text-sm">{row.band1Count}</TableCell>
                          <TableCell className="text-sm">{row.band2Count}</TableCell>
                          <TableCell className="text-sm">{row.band3Count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unpaid orders */}
        <TabsContent value="unpaid">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Unpaid Orders</CardTitle>
              <ExportButton type="unpaid" />
            </CardHeader>
            <CardContent className="p-0">
              {unpaid.length === 0 ? (
                <div className="p-4"><EmptyState title="No unpaid orders" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Ref</TableHead>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Phone</TableHead>
                        <TableHead className="text-xs">Amount Due</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Age (hrs)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaid.map((row) => (
                        <TableRow key={row.orderId}>
                          <TableCell className="font-mono text-xs">{row.orderRef}</TableCell>
                          <TableCell className="text-sm">{row.customerName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.customerPhone ?? "—"}</TableCell>
                          <TableCell className="text-sm font-medium">{formatKES(row.amountDue)}</TableCell>
                          <TableCell><PaymentStatusBadge status={row.paymentStatus} /></TableCell>
                          <TableCell className={`text-sm font-medium ${row.hoursOld >= 24 ? "text-destructive" : row.hoursOld >= 12 ? "text-amber-700" : ""}`}>
                            {row.hoursOld}h
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit ledger */}
        <TabsContent value="credit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Credit Ledger</CardTitle>
              <ExportButton type="credit" />
            </CardHeader>
            <CardContent className="p-0">
              {creditLedger.length === 0 ? (
                <div className="p-4"><EmptyState title="No credit transactions" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Phone</TableHead>
                        <TableHead className="text-xs">Total Credited</TableHead>
                        <TableHead className="text-xs">Total Used</TableHead>
                        <TableHead className="text-xs">Balance</TableHead>
                        <TableHead className="text-xs">Transactions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditLedger.map((row) => (
                        <TableRow key={row.customerId}>
                          <TableCell className="text-sm font-medium">{row.customerName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.customerPhone ?? "—"}</TableCell>
                          <TableCell className="text-sm text-teal-700">{formatKES(row.totalCredited)}</TableCell>
                          <TableCell className="text-sm text-destructive">-{formatKES(row.totalConsumed)}</TableCell>
                          <TableCell className="text-sm font-semibold">{formatKES(row.currentBalance)}</TableCell>
                          <TableCell className="text-sm">{row.transactionCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rider performance */}
        <TabsContent value="riders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Rider Performance</CardTitle>
              <ExportButton type="riders" from={from.toISOString().split("T")[0]} to={to.toISOString().split("T")[0]} />
            </CardHeader>
            <CardContent className="p-0">
              {riderPerf.length === 0 ? (
                <div className="p-4"><EmptyState title="No rider delivery data in this date range" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Rider</TableHead>
                        <TableHead className="text-xs">Assigned</TableHead>
                        <TableHead className="text-xs">Delivered</TableHead>
                        <TableHead className="text-xs">Failed</TableHead>
                        <TableHead className="text-xs">Success Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riderPerf.map((row) => (
                        <TableRow key={row.riderId}>
                          <TableCell className="text-sm font-medium">{row.riderName}</TableCell>
                          <TableCell className="text-sm">{row.totalAssigned}</TableCell>
                          <TableCell className="text-sm text-green-700">{row.totalDelivered}</TableCell>
                          <TableCell className="text-sm text-destructive">{row.totalFailed}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full rounded-full bg-green-500"
                                  style={{ width: `${row.successRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{row.successRate}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
