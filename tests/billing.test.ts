import { describe, expect, it } from "vitest";
import { grantCreditsForTossPayment, PRODUCT_CATALOG } from "@/lib/server/billing";
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

describe("Toss billing credit grants", () => {
  it("seeds the starter_30 credit bundle at 29,000 KRW", () => {
    expect(PRODUCT_CATALOG.starter_30).toMatchObject({
      credits: 30,
      amount: 29000,
      currency: "KRW"
    });
  });

  it("records duplicate Toss payment callbacks without double-crediting", () => {
    const store = createStore();

    const first = grantCreditsForTossPayment(store, {
      userId: user.id,
      paymentKey: "pay_1",
      orderId: "order_1",
      productId: "starter_30",
      raw: { eventType: "PAYMENT_APPROVED" }
    });
    const second = grantCreditsForTossPayment(store, {
      userId: user.id,
      paymentKey: "pay_1",
      orderId: "order_1",
      productId: "starter_30",
      raw: { eventType: "PAYMENT_APPROVED" }
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(store.users[0]).toMatchObject({
      plan: "starter",
      credits: 33
    });
    expect(store.billingEvents).toHaveLength(1);
    expect(store.creditLedger).toHaveLength(1);
  });
});
