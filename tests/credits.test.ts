import { describe, expect, it } from "vitest";
import { debitCredits, refundCredits } from "@/lib/credits";
import type { UserAccount } from "@/lib/types";

describe("credit accounting", () => {
  it("debits one generation set from the free trial balance", () => {
    const user: UserAccount = {
      id: "user_1",
      email: "seller@example.com",
      plan: "trial",
      credits: 3,
      createdAt: "2026-04-27T00:00:00.000Z"
    };

    const updated = debitCredits(user, 1);

    expect(updated.credits).toBe(2);
  });

  it("rejects generation when credits are exhausted", () => {
    const user: UserAccount = {
      id: "user_1",
      email: "seller@example.com",
      plan: "trial",
      credits: 0,
      createdAt: "2026-04-27T00:00:00.000Z"
    };

    expect(() => debitCredits(user, 1)).toThrow("INSUFFICIENT_CREDITS");
  });

  it("refunds credits after failed generation", () => {
    const user: UserAccount = {
      id: "user_1",
      email: "seller@example.com",
      plan: "trial",
      credits: 1,
      createdAt: "2026-04-27T00:00:00.000Z"
    };

    expect(refundCredits(user, 1).credits).toBe(2);
  });
});
