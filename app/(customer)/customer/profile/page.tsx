/**
 * app/(customer)/profile/page.tsx
 *
 * Customer profile: personal info, saved address, loyalty summary, credit balance.
 */

import { requireCustomer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatKES } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LOYALTY } from "@/lib/constants";
import { User, MapPin, Gift, Wallet } from "lucide-react";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const user = await requireCustomer();

  const [dbUser, customer] = await Promise.all([
    db.user.findUnique({ where: { id: user.id } }),
    db.customer.findUnique({
      where: { userId: user.id },
      include: {
        creditTransactions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    }),
  ]);

  if (!dbUser || !customer) return null;

  const loyaltyTarget = LOYALTY.QUALIFYING_ORDERS_REQUIRED;
  const loyaltyProgress = customer.loyaltyCount % loyaltyTarget;
  const loyaltyPct = (loyaltyProgress / loyaltyTarget) * 100;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Manage your account and preferences" />

      {/* Personal info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4" />
            Personal Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            userId={user.id}
            name={dbUser.name}
            email={dbUser.email ?? ""}
            phone={dbUser.phone ?? ""}
            defaultAddress={customer.defaultAddress ?? ""}
          />
        </CardContent>
      </Card>

      {/* Loyalty */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Gift className="h-4 w-4" />
            Loyalty Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completed qualifying orders</span>
            <span className="font-medium">{customer.loyaltyCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to next reward</span>
            <span className="font-medium">{loyaltyProgress} / {loyaltyTarget}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${loyaltyPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            You earn 1 free bottle every {loyaltyTarget} completed orders.
            Loyalty rewards never expire.
          </p>
        </CardContent>
      </Card>

      {/* Credit */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="h-4 w-4" />
            Account Credit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Available balance</span>
            <span className="text-lg font-semibold text-teal-700">
              {formatKES(customer.creditBalance)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Credit is applied automatically to your next order. It does not expire.
          </p>
          {customer.creditTransactions.length > 0 && (
            <>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Recent transactions</p>
              <div className="space-y-1.5">
                {customer.creditTransactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground capitalize">
                      {tx.reason.toLowerCase().replace(/_/g, " ")}
                    </span>
                    <span
                      className={
                        Number(tx.amount) >= 0 ? "text-teal-700 font-medium" : "text-destructive"
                      }
                    >
                      {Number(tx.amount) >= 0 ? "+" : ""}
                      {formatKES(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
