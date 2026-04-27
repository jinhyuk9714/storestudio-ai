import type { UserAccount } from "@/lib/types";

export function debitCredits(user: UserAccount, amount: number): UserAccount {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("INVALID_CREDIT_AMOUNT");
  }

  if (user.credits < amount) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  return {
    ...user,
    credits: user.credits - amount
  };
}

export function refundCredits(user: UserAccount, amount: number): UserAccount {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("INVALID_CREDIT_AMOUNT");
  }

  return {
    ...user,
    credits: user.credits + amount
  };
}
