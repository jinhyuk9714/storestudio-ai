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

export type VerifiedTossPayment = {
  paymentKey: string | null;
  orderId: string | null;
  amount: number | null;
  status: string | null;
  raw: unknown;
};

type TossWebhookVerificationOptions = {
  secretKey?: string;
  fetcher?: typeof fetch;
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

export function userIdFromOrderId(orderId: string | null): string | null {
  if (!orderId?.startsWith("order_")) {
    return null;
  }

  const withoutPrefix = orderId.slice("order_".length);
  const separatorIndex = withoutPrefix.lastIndexOf("_");
  if (separatorIndex <= 0) {
    return null;
  }
  return withoutPrefix.slice(0, separatorIndex);
}

export function orderIdBelongsToUser(orderId: string, userId: string): boolean {
  return userIdFromOrderId(orderId) === userId;
}

export async function verifyTossWebhookPayment(
  raw: unknown,
  options: TossWebhookVerificationOptions = {}
): Promise<VerifiedTossPayment | null> {
  const secretKey = options.secretKey ?? process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return null;
  }

  const claimed = extractPaymentFields(raw);
  if (!claimed.paymentKey && !claimed.orderId) {
    throw new Error("TOSS_WEBHOOK_PAYMENT_LOOKUP_REQUIRED");
  }

  const actualRaw = await retrieveTossPayment(
    {
      paymentKey: claimed.paymentKey,
      orderId: claimed.orderId
    },
    {
      secretKey,
      fetcher: options.fetcher
    }
  );
  const actual = extractPaymentFields(actualRaw);

  if (claimed.paymentKey && actual.paymentKey !== claimed.paymentKey) {
    throw new Error("TOSS_WEBHOOK_PAYMENT_MISMATCH");
  }
  if (claimed.orderId && actual.orderId !== claimed.orderId) {
    throw new Error("TOSS_WEBHOOK_PAYMENT_MISMATCH");
  }
  if (claimed.amount !== null && actual.amount !== null && actual.amount !== claimed.amount) {
    throw new Error("TOSS_WEBHOOK_PAYMENT_MISMATCH");
  }

  return {
    ...actual,
    raw: actualRaw
  };
}

export async function retrieveTossPayment(
  input: { paymentKey: string | null; orderId: string | null },
  options: { secretKey?: string; fetcher?: typeof fetch } = {}
): Promise<unknown> {
  const secretKey = options.secretKey ?? process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY_REQUIRED");
  }
  const fetcher = options.fetcher ?? fetch;
  const lookupPath = input.paymentKey
    ? `/v1/payments/${encodeURIComponent(input.paymentKey)}`
    : input.orderId
      ? `/v1/payments/orders/${encodeURIComponent(input.orderId)}`
      : null;

  if (!lookupPath) {
    throw new Error("TOSS_WEBHOOK_PAYMENT_LOOKUP_REQUIRED");
  }

  const response = await fetcher(`https://api.tosspayments.com${lookupPath}`, {
    method: "GET",
    headers: {
      Authorization: tossAuthorizationHeader(secretKey)
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? "TOSS_PAYMENT_LOOKUP_FAILED");
  }
  return payload;
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
      Authorization: tossAuthorizationHeader(process.env.TOSS_SECRET_KEY),
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

function tossAuthorizationHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

function extractPaymentFields(raw: unknown): VerifiedTossPayment {
  const source = raw && typeof raw === "object" && "data" in raw
    ? (raw as { data?: unknown }).data
    : raw;

  return {
    paymentKey: readStringField(source, "paymentKey"),
    orderId: readStringField(source, "orderId"),
    amount: readNumberField(source, "totalAmount") ?? readNumberField(source, "amount"),
    status: readStringField(source, "status"),
    raw
  };
}

function readStringField(source: unknown, key: string): string | null {
  if (!source || typeof source !== "object") {
    return null;
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumberField(source: unknown, key: string): number | null {
  if (!source || typeof source !== "object") {
    return null;
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}
