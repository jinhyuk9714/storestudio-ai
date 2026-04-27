import { describe, expect, it } from "vitest";
import { applyCreditLedgerEntry } from "@/lib/server/credit-ledger";
import type { StoreData, UserAccount } from "@/lib/types";

const user: UserAccount = {
  id: "user_1",
  email: "seller@example.com",
  plan: "trial",
  credits: 3,
  createdAt: "2026-04-27T00:00:00.000Z"
};

function createStore(): StoreData {
  return {
    users: [{ ...user }],
    projects: [],
    assets: [],
    jobs: [],
    waitlist: [],
    billingEvents: [],
    creditLedger: []
  };
}

describe("applyCreditLedgerEntry", () => {
  it("does not debit credits twice for the same idempotency key", () => {
    const store = createStore();

    const first = applyCreditLedgerEntry(store, {
      userId: user.id,
      amount: -1,
      reason: "generation_debit",
      jobId: "job_1",
      idempotencyKey: "job_1:generation_debit"
    });
    const second = applyCreditLedgerEntry(store, {
      userId: user.id,
      amount: -1,
      reason: "generation_debit",
      jobId: "job_1",
      idempotencyKey: "job_1:generation_debit"
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(store.users[0].credits).toBe(2);
    expect(store.creditLedger).toHaveLength(1);
  });

  it("refunds a failed generation exactly once", () => {
    const store = createStore();

    applyCreditLedgerEntry(store, {
      userId: user.id,
      amount: -1,
      reason: "generation_debit",
      jobId: "job_1",
      idempotencyKey: "job_1:generation_debit"
    });
    applyCreditLedgerEntry(store, {
      userId: user.id,
      amount: 1,
      reason: "generation_refund",
      jobId: "job_1",
      idempotencyKey: "job_1:generation_refund"
    });
    applyCreditLedgerEntry(store, {
      userId: user.id,
      amount: 1,
      reason: "generation_refund",
      jobId: "job_1",
      idempotencyKey: "job_1:generation_refund"
    });

    expect(store.users[0].credits).toBe(3);
    expect(store.creditLedger.map((entry) => entry.reason)).toEqual([
      "generation_debit",
      "generation_refund"
    ]);
  });
});
