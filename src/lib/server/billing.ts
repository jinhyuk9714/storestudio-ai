import { randomUUID } from "node:crypto";
import { applyCreditLedgerEntry } from "@/lib/server/credit-ledger";
import type { BillingEvent, StoreData, UserAccount } from "@/lib/types";

export const PRODUCT_CATALOG = {
  starter_30: {
    id: "starter_30",
    name: "Starter 30 credits",
    credits: 30,
    amount: 29000,
    currency: "KRW"
  }
} as const;

export type ProductId = keyof typeof PRODUCT_CATALOG;

export type TossCreditGrantInput = {
  userId: string;
  paymentKey: string | null;
  orderId: string | null;
  productId?: ProductId;
  raw: unknown;
};

export type TossCreditGrantResult = {
  duplicate: boolean;
  creditsGranted: number;
  user: UserAccount;
  billingEvent: BillingEvent | null;
};

export function grantCreditsForTossPayment(
  data: StoreData,
  input: TossCreditGrantInput
): TossCreditGrantResult {
  const product = PRODUCT_CATALOG[input.productId ?? "starter_30"];
  const duplicateEvent = data.billingEvents.find((event) => {
    if (input.paymentKey && event.paymentKey === input.paymentKey) {
      return true;
    }
    return Boolean(input.orderId && event.orderId === input.orderId);
  });
  const user = requireUser(data, input.userId);

  if (duplicateEvent) {
    return {
      duplicate: true,
      creditsGranted: duplicateEvent.creditsGranted,
      user,
      billingEvent: duplicateEvent
    };
  }

  const billingEvent: BillingEvent = {
    id: `bill_${randomUUID()}`,
    provider: "toss",
    userId: input.userId,
    eventType: eventTypeFromRaw(input.raw),
    paymentKey: input.paymentKey,
    orderId: input.orderId,
    productId: product.id,
    creditsGranted: product.credits,
    raw: input.raw,
    createdAt: new Date().toISOString()
  };
  data.billingEvents.push(billingEvent);

  const ledger = applyCreditLedgerEntry(data, {
    userId: input.userId,
    amount: product.credits,
    reason: "purchase_grant",
    billingEventId: billingEvent.id,
    idempotencyKey: `toss:${input.paymentKey ?? input.orderId ?? billingEvent.id}`
  });

  return {
    duplicate: ledger.duplicate,
    creditsGranted: product.credits,
    user: ledger.user,
    billingEvent
  };
}

export function productForAmount(amount: number): ProductId {
  if (amount === PRODUCT_CATALOG.starter_30.amount) {
    return "starter_30";
  }
  throw new Error("UNKNOWN_BILLING_PRODUCT");
}

export async function confirmTossPayment(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<unknown> {
  if (!process.env.TOSS_SECRET_KEY) {
    return {
      status: "DONE",
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      totalAmount: input.amount,
      mode: "local"
    };
  }

  const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? "TOSS_CONFIRM_FAILED");
  }
  return payload;
}

function requireUser(data: StoreData, userId: string): UserAccount {
  const user = data.users.find((candidate) => candidate.id === userId);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  return user;
}

function eventTypeFromRaw(raw: unknown): string {
  if (raw && typeof raw === "object" && "eventType" in raw) {
    const eventType = (raw as { eventType?: unknown }).eventType;
    if (typeof eventType === "string") {
      return eventType;
    }
  }
  return "PAYMENT_APPROVED";
}
