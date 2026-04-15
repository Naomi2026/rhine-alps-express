/**
 * app/(super-admin)/super-admin/settings/page.tsx
 *
 * System settings key-value editor for Super Admin.
 * Values map to the SystemSetting table; defaults are seeded.
 */

import { requireSuperAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingRow } from "./setting-row";

export const dynamic = "force-dynamic";

// Known settings with descriptions shown in the UI
const SETTING_META: Record<string, string> = {
  same_day_cutoff:          "Same-day delivery cutoff (24h, e.g. 18:30)",
  order_acceptance_cutoff:  "Last time orders are accepted same day (24h, e.g. 20:00)",
  band1_radius_km:          "Band 1 pricing radius in kilometres",
  band1_bottle_price:       "Band 1 bottle price (KES)",
  band2_bottle_price:       "Band 2 bottle price (KES)",
  band3_bottle_price:       "Band 3 bottle price (KES)",
  band3_fee_per_km:         "Band 3 delivery fee per km (KES)",
  slot_reservation_hours:   "Slot reservation window (hours)",
  credit_super_admin_threshold: "Credit adjustment threshold requiring Super Admin approval (KES)",
  otp_expiry_hours:         "OTP expiry window (hours)",
};

export default async function SuperAdminSettingsPage() {
  const user = await requireSuperAdminSession();

  const settings = await db.systemSetting.findMany({
    orderBy: { key: "asc" },
  });

  // Group by known vs unknown
  const known = settings.filter((s) => s.key in SETTING_META);
  const other = settings.filter((s) => !(s.key in SETTING_META));

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="System Settings"
        description="Adjust operational parameters. Changes take effect immediately."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Operational Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 divide-y">
          {known.map((s) => (
            <SettingRow
              key={s.id}
              settingId={s.id}
              settingKey={s.key}
              value={s.value}
              description={SETTING_META[s.key] ?? s.key}
              actingUserId={user.id}
            />
          ))}
          {known.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              No settings seeded yet. Run the seed script to populate defaults.
            </p>
          )}
        </CardContent>
      </Card>

      {other.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Other Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 divide-y">
            {other.map((s) => (
              <SettingRow
                key={s.id}
                settingId={s.id}
                settingKey={s.key}
                value={s.value}
                description={s.description ?? s.key}
                actingUserId={user.id}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
