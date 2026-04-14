/**
 * prisma/seed.ts
 * Rhine Alps Express — database seed script
 *
 * Run with:  npm run db:seed
 *
 * Creates:
 *   - 1 Super Admin
 *   - 2 Admins
 *   - 2 Riders (with Rider profiles)
 *   - 3 Customers (with Customer profiles, credit, loyalty data)
 *   - 4 Delivery slots (fixed business-rules §3.1)
 *   - 5 Band 2 service zones (business-rules §7.2)
 *   - System settings
 *   - Sample orders in various states
 */

import {
  PrismaClient,
  UserRole,
  OrderStatus,
  DeliveryStatus,
  PaymentStatus,
  PaymentMethod,
  PricingBand,
  CreditReason,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function hash(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function orderRef(date: Date, seq: number): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `RAX-${d}-${String(seq).padStart(3, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding Rhine Alps Express database…\n");

  // ── 0. Wipe in dependency order ──────────────────────────────────────────
  await prisma.oTPVerification.deleteMany();
  await prisma.oTPRecord.deleteMany();
  await prisma.deliveryAttempt.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.creditTransaction.deleteMany();
  await prisma.slotCapacity.deleteMany();
  await prisma.deliverySlot.deleteMany();
  await prisma.serviceZone.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.rider.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.verificationToken.deleteMany();

  console.log("  ✓ Cleared existing data");

  // ── 1. Users ─────────────────────────────────────────────────────────────

  const superAdminUser = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "superadmin@rhinealpss.co.ke",
      phone: "+254700000001",
      passwordHash: await hash("SuperAdmin123!"),
      role: UserRole.SUPER_ADMIN,
    },
  });

  const adminUser1 = await prisma.user.create({
    data: {
      name: "Grace Wanjiku",
      email: "admin@rhinealpss.co.ke",
      phone: "+254700000002",
      passwordHash: await hash("Admin123!"),
      role: UserRole.ADMIN,
      createdById: superAdminUser.id,
    },
  });

  const adminUser2 = await prisma.user.create({
    data: {
      name: "Brian Otieno",
      email: "ops@rhinealpss.co.ke",
      phone: "+254700000003",
      passwordHash: await hash("Admin123!"),
      role: UserRole.ADMIN,
      createdById: superAdminUser.id,
    },
  });

  const riderUser1 = await prisma.user.create({
    data: {
      name: "James Kariuki",
      email: "rider.james@rhinealpss.co.ke",
      phone: "+254711000001",
      passwordHash: await hash("Rider123!"),
      role: UserRole.RIDER,
      createdById: superAdminUser.id,
    },
  });

  const riderUser2 = await prisma.user.create({
    data: {
      name: "Peter Mwangi",
      email: "rider.peter@rhinealpss.co.ke",
      phone: "+254711000002",
      passwordHash: await hash("Rider123!"),
      role: UserRole.RIDER,
      createdById: superAdminUser.id,
    },
  });

  // Customers
  const customerUser1 = await prisma.user.create({
    data: {
      name: "Jane Kamau",
      email: "jane.kamau@example.com",
      phone: "+254722100001",
      passwordHash: await hash("Customer123!"),
      role: UserRole.CUSTOMER,
    },
  });

  const customerUser2 = await prisma.user.create({
    data: {
      name: "John Njoroge",
      email: "john.njoroge@example.com",
      phone: "+254722100002",
      passwordHash: await hash("Customer123!"),
      role: UserRole.CUSTOMER,
    },
  });

  const customerUser3 = await prisma.user.create({
    data: {
      name: "Mary Achieng",
      email: "mary.achieng@example.com",
      phone: "+254722100003",
      passwordHash: await hash("Customer123!"),
      role: UserRole.CUSTOMER,
    },
  });

  console.log("  ✓ Users created (1 super admin, 2 admins, 2 riders, 3 customers)");

  // ── 2. Role profiles ─────────────────────────────────────────────────────

  const rider1 = await prisma.rider.create({
    data: { userId: riderUser1.id, isOnline: true },
  });

  await prisma.rider.create({
    data: { userId: riderUser2.id, isOnline: false },
  });

  // Customer 1 — Band 1 address, has credit balance (KES 300 from prior cancellation)
  const customer1 = await prisma.customer.create({
    data: {
      userId: customerUser1.id,
      defaultAddress: "Infinity Industrial Park, Ruiru",
      defaultLat: -1.1453,
      defaultLng: 36.9613,
      defaultLocationRef: "ChIJ-ruiru-infinity",
      creditBalance: 300,
      loyaltyCount: 7, // 7 of 10 qualifying orders completed
    },
  });

  // Customer 2 — Band 2 address (Kahawa Sukari), no credit, 3/10 loyalty
  const customer2 = await prisma.customer.create({
    data: {
      userId: customerUser2.id,
      defaultAddress: "Kahawa Sukari, Nairobi",
      defaultLat: -1.1803,
      defaultLng: 36.9219,
      defaultLocationRef: "ChIJ-kahawa-sukari",
      creditBalance: 0,
      loyaltyCount: 3,
    },
  });

  // Customer 3 — Band 3 address, no credit, 0/10 loyalty
  const customer3 = await prisma.customer.create({
    data: {
      userId: customerUser3.id,
      defaultAddress: "Kasarani, Nairobi",
      defaultLat: -1.2247,
      defaultLng: 36.8987,
      defaultLocationRef: "ChIJ-kasarani",
      creditBalance: 0,
      loyaltyCount: 0,
    },
  });

  console.log("  ✓ Customer and Rider profiles created");

  // Credit transaction ledger entry for customer1's balance
  await prisma.creditTransaction.create({
    data: {
      customerId: customer1.id,
      amount: 300,
      reason: CreditReason.CANCELLED_ORDER,
      createdByUserId: adminUser1.id,
      note: "Credit from cancelled Band 1 order — 2 bottles at KES 150 each",
    },
  });

  console.log("  ✓ Credit ledger seeded for Customer 1");

  // ── 3. Delivery slots ─────────────────────────────────────────────────────

  const slot1 = await prisma.deliverySlot.create({
    data: { label: "9:00 AM – 12:00 PM", startTime: "09:00", endTime: "12:00", sortOrder: 1 },
  });
  const slot2 = await prisma.deliverySlot.create({
    data: { label: "12:00 PM – 3:00 PM", startTime: "12:00", endTime: "15:00", sortOrder: 2 },
  });
  const slot3 = await prisma.deliverySlot.create({
    data: { label: "3:00 PM – 5:00 PM", startTime: "15:00", endTime: "17:00", sortOrder: 3 },
  });
  const slot4 = await prisma.deliverySlot.create({
    data: { label: "5:00 PM – 7:45 PM", startTime: "17:00", endTime: "19:45", sortOrder: 4 },
  });

  // Seed slot capacities for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const slot of [slot1, slot2, slot3, slot4]) {
    for (const band of [PricingBand.BAND_1, PricingBand.BAND_2, PricingBand.BAND_3]) {
      await prisma.slotCapacity.create({
        data: { slotId: slot.id, pricingBand: band, date: today, maxOrders: 20, bookedOrders: 0 },
      });
    }
  }

  console.log("  ✓ Delivery slots and today's capacities created");

  // ── 4. Service zones (Band 2) ─────────────────────────────────────────────

  const band2Zones = [
    { name: "Kamakis", aliases: ["Kamakis Estate", "Kamakis Junction"] },
    { name: "Mwihoko", aliases: ["Mwihoko Estate"] },
    { name: "Kahawa Sukari", aliases: ["Kahawa-Sukari", "KahawaSukari"] },
    { name: "Githurai", aliases: ["Githurai 44", "Githurai 45", "Githurai Estate"] },
    { name: "EasternVille", aliases: ["Eastern Ville", "Easternville"] },
  ];

  for (const zone of band2Zones) {
    await prisma.serviceZone.create({ data: zone });
  }

  console.log("  ✓ Band 2 service zones seeded");

  // ── 5. System settings ────────────────────────────────────────────────────

  await prisma.systemSetting.createMany({
    data: [
      {
        key: "CREDIT_SUPER_ADMIN_THRESHOLD_KES",
        value: "1000",
        description:
          "Credit adjustments above this amount (KES) require Super Admin approval (§10.4)",
        updatedById: superAdminUser.id,
      },
      {
        key: "DISPATCH_LAT",
        value: "-1.1453",
        description: "Latitude of dispatch location (Rhine Alps Limited, Infinity Industrial Park)",
        updatedById: superAdminUser.id,
      },
      {
        key: "DISPATCH_LNG",
        value: "36.9613",
        description: "Longitude of dispatch location",
        updatedById: superAdminUser.id,
      },
      {
        key: "MAX_SERVICE_RADIUS_KM",
        value: "30",
        description: "Maximum delivery radius in km (§5.3)",
        updatedById: superAdminUser.id,
      },
      {
        key: "BAND_1_RADIUS_KM",
        value: "2",
        description: "Radius in km for Band 1 pricing (§7.1)",
        updatedById: superAdminUser.id,
      },
      {
        key: "BAND_1_BOTTLE_PRICE_KES",
        value: "150",
        description: "Band 1 bottle price in KES",
        updatedById: superAdminUser.id,
      },
      {
        key: "BAND_2_BOTTLE_PRICE_KES",
        value: "200",
        description: "Band 2 bottle price in KES",
        updatedById: superAdminUser.id,
      },
      {
        key: "BAND_3_BOTTLE_PRICE_KES",
        value: "150",
        description: "Band 3 bottle price in KES",
        updatedById: superAdminUser.id,
      },
      {
        key: "BAND_3_DELIVERY_FEE_PER_KM_KES",
        value: "30",
        description: "Band 3 per-km delivery fee in KES (§7.3)",
        updatedById: superAdminUser.id,
      },
      {
        key: "NEW_BOTTLE_PURCHASE_PRICE_KES",
        value: "450",
        description: "One-off price for purchasing a new 20L bottle (§6.2)",
        updatedById: superAdminUser.id,
      },
      {
        key: "LOYALTY_QUALIFYING_ORDERS_REQUIRED",
        value: "10",
        description: "Qualifying completed orders before loyalty reward (§11.1)",
        updatedById: superAdminUser.id,
      },
      {
        key: "SLOT_RESERVATION_HOURS",
        value: "4",
        description: "Hours a slot remains reserved during checkout before payment (§3.5)",
        updatedById: superAdminUser.id,
      },
      {
        key: "SAME_DAY_CUTOFF_TIME",
        value: "18:30",
        description: "Standard same-day delivery cutoff (24-hr, §2.2)",
        updatedById: superAdminUser.id,
      },
      {
        key: "ORDER_CUTOFF_TIME",
        value: "20:00",
        description: "Latest time orders are accepted for processing same day (§2.1)",
        updatedById: superAdminUser.id,
      },
      {
        key: "SLOT_MIN_LEAD_TIME_MINUTES",
        value: "30",
        description: "Minimum lead time in minutes to book a slot (§3.3)",
        updatedById: superAdminUser.id,
      },
      {
        key: "OTP_MAX_VALIDATION_ATTEMPTS",
        value: "3",
        description: "Maximum OTP validation attempts before admin review (§15.3)",
        updatedById: superAdminUser.id,
      },
      {
        key: "OTP_MAX_RESEND_ATTEMPTS",
        value: "3",
        description: "Maximum OTP resend attempts (§15.3)",
        updatedById: superAdminUser.id,
      },
      {
        key: "OTP_RESEND_COOLDOWN_SECONDS",
        value: "30",
        description: "Cooldown between OTP resend attempts in seconds (§15.3)",
        updatedById: superAdminUser.id,
      },
      {
        key: "UNPAID_REMINDER_FIRST_HOURS",
        value: "12",
        description: "Hours after which first unpaid reminder is sent (§9.10)",
        updatedById: superAdminUser.id,
      },
      {
        key: "UNPAID_REMINDER_SECOND_HOURS",
        value: "24",
        description: "Hours after which second unpaid reminder is sent (§9.10)",
        updatedById: superAdminUser.id,
      },
      {
        key: "AUDIT_RETENTION_DAYS",
        value: "30",
        description: "Audit log retention period in days for MVP (§24.3)",
        updatedById: superAdminUser.id,
      },
      {
        key: "MAX_ORDER_QUANTITY",
        value: "20",
        description: "Maximum bottles per order (§6.4)",
        updatedById: superAdminUser.id,
      },
      {
        key: "FAILED_LOGIN_LOCKOUT_THRESHOLD",
        value: "3",
        description: "Failed login attempts before account lock (§4.5)",
        updatedById: superAdminUser.id,
      },
    ],
  });

  console.log("  ✓ System settings seeded");

  // ── 6. Sample orders ──────────────────────────────────────────────────────

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3);
  pastDate.setHours(0, 0, 0, 0);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // Order 1 — COMPLETED, Band 1, customer1 (counts toward loyalty → loyaltyCount already set to 7)
  const order1 = await prisma.order.create({
    data: {
      orderRef: orderRef(pastDate, 1),
      customerId: customer1.id,
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.MPESA,
      deliveryAddress: "Infinity Industrial Park, Ruiru",
      deliveryLat: -1.1453,
      deliveryLng: 36.9613,
      pricingBand: PricingBand.BAND_1,
      distanceKm: 0.5,
      bottleUnitPrice: 150,
      deliveryFee: 0,
      subtotal: 300,
      totalAmount: 300,
      creditApplied: 0,
      amountDue: 300,
      slotId: slot1.id,
      deliveryDate: pastDate,
      isAdminConfirmed: true,
      countsForLoyalty: true,
      items: {
        create: [
          {
            productName: "20L Bottle – Refill",
            productSku: "20L-REFILL",
            quantity: 2,
            unitPrice: 150,
            lineTotal: 300,
            isExchange: true,
          },
        ],
      },
    },
  });

  await prisma.delivery.create({
    data: {
      orderId: order1.id,
      riderId: rider1.id,
      status: DeliveryStatus.DELIVERED,
      pickedUpAt: new Date(pastDate.getTime() + 9.5 * 3600_000),
      arrivedAt: new Date(pastDate.getTime() + 10 * 3600_000),
      deliveredAt: new Date(pastDate.getTime() + 10.1 * 3600_000),
      cashCollected: null,
    },
  });

  await prisma.oTPRecord.create({
    data: {
      orderId: order1.id,
      // Hash of "1234" — real OTPs are generated at runtime; this is seed data only
      tokenHash: await hash("123456"),
      expiresAt: new Date(pastDate.getTime() + 11 * 3600_000),
      isUsed: true,
      usedAt: new Date(pastDate.getTime() + 10.1 * 3600_000),
      validationAttempts: 1,
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order1.id,
      method: PaymentMethod.MPESA,
      amount: 300,
      status: PaymentStatus.PAID,
      mpesaCode: "QHX1234567",
      mpesaPhone: "+254722100001",
      enteredByUserId: adminUser1.id,
      enteredAt: new Date(pastDate.getTime() + 8 * 3600_000),
    },
  });

  console.log("  ✓ Order 1 — COMPLETED (Band 1, M-Pesa, OTP verified)");

  // Order 2 — OUT_FOR_DELIVERY, Band 2, customer2, COD
  const order2 = await prisma.order.create({
    data: {
      orderRef: orderRef(todayDate, 1),
      customerId: customer2.id,
      status: OrderStatus.OUT_FOR_DELIVERY,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      deliveryAddress: "Kahawa Sukari, Nairobi",
      deliveryLat: -1.1803,
      deliveryLng: 36.9219,
      pricingBand: PricingBand.BAND_2,
      distanceKm: 5.2,
      bottleUnitPrice: 200,
      deliveryFee: 0,
      subtotal: 600,
      totalAmount: 600,
      creditApplied: 0,
      amountDue: 600,
      slotId: slot2.id,
      deliveryDate: todayDate,
      isAdminConfirmed: true,
      countsForLoyalty: true,
      items: {
        create: [
          {
            productName: "20L Bottle – Refill",
            productSku: "20L-REFILL",
            quantity: 3,
            unitPrice: 200,
            lineTotal: 600,
            isExchange: true,
          },
        ],
      },
    },
  });

  await prisma.delivery.create({
    data: {
      orderId: order2.id,
      riderId: rider1.id,
      status: DeliveryStatus.IN_TRANSIT,
      pickedUpAt: new Date(),
    },
  });

  await prisma.oTPRecord.create({
    data: {
      orderId: order2.id,
      tokenHash: await hash("654321"),
      expiresAt: new Date(Date.now() + 4 * 3600_000),
      isUsed: false,
      validationAttempts: 0,
    },
  });

  console.log("  ✓ Order 2 — OUT_FOR_DELIVERY (Band 2, COD, OTP pending)");

  // Order 3 — AWAITING_PAYMENT, Band 3, customer3, M-Pesa
  const order3 = await prisma.order.create({
    data: {
      orderRef: orderRef(todayDate, 2),
      customerId: customer3.id,
      status: OrderStatus.AWAITING_PAYMENT,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.MPESA,
      deliveryAddress: "Kasarani, Nairobi",
      deliveryLat: -1.2247,
      deliveryLng: 36.8987,
      pricingBand: PricingBand.BAND_3,
      distanceKm: 12.4,
      bottleUnitPrice: 150,
      deliveryFee: 372, // 12.4 × 30
      subtotal: 300,    // 2 × 150
      totalAmount: 672,
      creditApplied: 0,
      amountDue: 672,
      slotId: slot3.id,
      deliveryDate: todayDate,
      isAdminConfirmed: false,
      countsForLoyalty: true,
      items: {
        create: [
          {
            productName: "20L Bottle – Refill",
            productSku: "20L-REFILL",
            quantity: 2,
            unitPrice: 150,
            lineTotal: 300,
            isExchange: true,
          },
        ],
      },
    },
  });

  await prisma.delivery.create({
    data: {
      orderId: order3.id,
      status: DeliveryStatus.NOT_SCHEDULED,
    },
  });

  console.log("  ✓ Order 3 — AWAITING_PAYMENT (Band 3, M-Pesa, rider not yet assigned)");

  // Order 4 — PLACED, Band 1, customer1, credit auto-applied (KES 300 credit → amountDue 0)
  const order4 = await prisma.order.create({
    data: {
      orderRef: orderRef(todayDate, 3),
      customerId: customer1.id,
      status: OrderStatus.PLACED,
      paymentStatus: PaymentStatus.CREDIT_APPLIED,
      paymentMethod: PaymentMethod.MPESA,
      deliveryAddress: "Infinity Industrial Park, Ruiru",
      deliveryLat: -1.1453,
      deliveryLng: 36.9613,
      pricingBand: PricingBand.BAND_1,
      distanceKm: 0.5,
      bottleUnitPrice: 150,
      deliveryFee: 0,
      subtotal: 150,
      totalAmount: 150,
      creditApplied: 150, // partial credit applied; 150 remaining in account
      amountDue: 0,
      slotId: slot1.id,
      deliveryDate: todayDate,
      isAdminConfirmed: false,
      countsForLoyalty: true,
      items: {
        create: [
          {
            productName: "20L Bottle – Refill",
            productSku: "20L-REFILL",
            quantity: 1,
            unitPrice: 150,
            lineTotal: 150,
            isExchange: true,
          },
        ],
      },
    },
  });

  await prisma.delivery.create({
    data: {
      orderId: order4.id,
      status: DeliveryStatus.NOT_SCHEDULED,
    },
  });

  // Record the credit usage in the ledger
  await prisma.creditTransaction.create({
    data: {
      customerId: customer1.id,
      amount: -150,
      reason: CreditReason.CREDIT_USED,
      relatedOrderId: order4.id,
      note: "Auto-applied credit to order " + order4.orderRef,
    },
  });

  // Update customer1 running balance (300 - 150 = 150)
  await prisma.customer.update({
    where: { id: customer1.id },
    data: { creditBalance: 150 },
  });

  console.log("  ✓ Order 4 — PLACED (Band 1, credit auto-applied)");

  // ── 7. Seed a sample audit log entry ─────────────────────────────────────

  await prisma.auditLog.create({
    data: {
      action: "order.status.changed",
      entityType: "Order",
      entityId: order1.id,
      userId: adminUser1.id,
      orderId: order1.id,
      before: { status: "DELIVERED" },
      after: { status: "COMPLETED" },
      reason: "All payment and OTP conditions satisfied",
    },
  });

  console.log("  ✓ Sample audit log entry created");

  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n✅  Seed complete.\n");
  console.log("  Login credentials (all passwords are examples only):");
  console.log("  ┌──────────────────────────────────────────────────────────────────┐");
  console.log("  │  Super Admin  superadmin@rhinealpss.co.ke  /  SuperAdmin123!     │");
  console.log("  │  Admin        admin@rhinealpss.co.ke       /  Admin123!          │");
  console.log("  │  Admin        ops@rhinealpss.co.ke         /  Admin123!          │");
  console.log("  │  Rider        rider.james@rhinealpss.co.ke /  Rider123!          │");
  console.log("  │  Rider        rider.peter@rhinealpss.co.ke /  Rider123!          │");
  console.log("  │  Customer     jane.kamau@example.com       /  Customer123!       │");
  console.log("  │  Customer     john.njoroge@example.com     /  Customer123!       │");
  console.log("  │  Customer     mary.achieng@example.com     /  Customer123!       │");
  console.log("  └──────────────────────────────────────────────────────────────────┘\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
