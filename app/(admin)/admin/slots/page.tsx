/**
 * app/(admin)/admin/slots/page.tsx
 *
 * Delivery slot management: view slots and toggle active/inactive.
 */

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SlotToggleButton } from "./slot-toggle";

export const dynamic = "force-dynamic";

export default async function AdminSlotsPage() {
  await requireAdminSession();

  const slots = await db.deliverySlot.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Delivery Slots"
        description="Manage the available delivery time windows."
      />
      <p className="text-sm text-muted-foreground">
        Disabled slots will not be shown to customers during checkout.
        Existing orders with a disabled slot are not affected.
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Slot</TableHead>
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">End</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell className="text-sm font-medium">{slot.label}</TableCell>
                  <TableCell className="text-xs font-mono">{slot.startTime}</TableCell>
                  <TableCell className="text-xs font-mono">{slot.endTime}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium ${
                        slot.isActive ? "text-green-700" : "text-muted-foreground"
                      }`}
                    >
                      {slot.isActive ? "Active" : "Disabled"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <SlotToggleButton slotId={slot.id} isActive={slot.isActive} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
