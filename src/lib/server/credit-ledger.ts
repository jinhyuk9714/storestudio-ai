import { createCreditLedgerEntry } from "@/lib/server/store";
import type { CreditLedgerEntry, CreditLedgerReason, StoreData, UserAccount } from "@/lib/types";

export type ApplyCreditLedgerEntryInput = {
  userId: string;
  amount: number;
  reason: CreditLedgerReason;
  idempotencyKey: string;
  jobId?: string | null;
  billingEventId?: string | null;
};

export type ApplyCreditLedgerEntryResult = {
  duplicate: boolean;
  user: UserAccount;
  entry: CreditLedgerEntry | null;
};

export function applyCreditLedgerEntry(
  data: StoreData,
  input: ApplyCreditLedgerEntryInput
): ApplyCreditLedgerEntryResult {
  const existing = data.creditLedger.find(
    (entry) => entry.idempotencyKey === input.idempotencyKey
  );
  const userIndex = data.users.findIndex((candidate) => candidate.id === input.userId);

  if (userIndex < 0) {
    throw new Error("USER_NOT_FOUND");
  }

  const user = data.users[userIndex];

  if (existing) {
    return {
      duplicate: true,
      user,
      entry: existing
    };
  }

  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw new Error("INVALID_CREDIT_AMOUNT");
  }

  const nextCredits = user.credits + input.amount;
  if (nextCredits < 0) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  const nextUser: UserAccount = {
    ...user,
    plan: input.reason === "purchase_grant" ? "starter" : user.plan,
    credits: nextCredits
  };
  const entry = createCreditLedgerEntry({
    userId: input.userId,
    amount: input.amount,
    reason: input.reason,
    jobId: input.jobId ?? null,
    billingEventId: input.billingEventId ?? null,
    idempotencyKey: input.idempotencyKey
  });

  data.users[userIndex] = nextUser;
  data.creditLedger.push(entry);

  return {
    duplicate: false,
    user: nextUser,
    entry
  };
}

export function recordCreditLedgerMemo(
  data: StoreData,
  input: ApplyCreditLedgerEntryInput
): CreditLedgerEntry | null {
  const existing = data.creditLedger.find(
    (entry) => entry.idempotencyKey === input.idempotencyKey
  );
  if (existing) {
    return null;
  }

  const entry = createCreditLedgerEntry({
    userId: input.userId,
    amount: input.amount,
    reason: input.reason,
    jobId: input.jobId ?? null,
    billingEventId: input.billingEventId ?? null,
    idempotencyKey: input.idempotencyKey
  });
  data.creditLedger.push(entry);
  return entry;
}
