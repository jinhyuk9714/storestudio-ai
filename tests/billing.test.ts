import { describe, expect, it } from "vitest";
import {
  grantCreditsForTossPayment,
  orderIdBelongsToUser,
  PRODUCT_CATALOG,
  verifyTossWebhookPayment
} from "@/lib/server/billing";
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

  it("verifies webhook payment data against Toss before trusting the payload", async () => {
    const payment = await verifyTossWebhookPayment(
      {
        eventType: "PAYMENT_STATUS_CHANGED",
        data: {
          paymentKey: "pay_verified",
          orderId: "order_user_1_123",
          totalAmount: 29000
        }
      },
      {
        secretKey: "test_sk_secret",
        fetcher: async (url, init) => {
          expect(String(url)).toBe("https://api.tosspayments.com/v1/payments/pay_verified");
          expect(init?.headers).toMatchObject({
            Authorization: expect.stringContaining("Basic ")
          });

          return new Response(
            JSON.stringify({
              paymentKey: "pay_verified",
              orderId: "order_user_1_123",
              totalAmount: 29000,
              status: "DONE",
              currency: "KRW"
            }),
            { status: 200 }
          );
        }
      }
    );

    expect(payment).toMatchObject({
      paymentKey: "pay_verified",
      orderId: "order_user_1_123",
      amount: 29000,
      status: "DONE"
    });
  });

  it("rejects spoofed webhook payloads when Toss returns different payment data", async () => {
    await expect(
      verifyTossWebhookPayment(
        {
          eventType: "PAYMENT_STATUS_CHANGED",
          data: {
            paymentKey: "pay_spoofed",
            orderId: "order_user_1_123",
            totalAmount: 29000
          }
        },
        {
          secretKey: "test_sk_secret",
          fetcher: async () =>
            new Response(
              JSON.stringify({
                paymentKey: "pay_spoofed",
                orderId: "order_attacker_123",
                totalAmount: 29000,
                status: "DONE",
                currency: "KRW"
              }),
              { status: 200 }
            )
        }
      )
    ).rejects.toThrow("TOSS_WEBHOOK_PAYMENT_MISMATCH");
  });

  it("only lets users confirm their own checkout order IDs", () => {
    expect(orderIdBelongsToUser("order_user_1_abc", "user_1")).toBe(true);
    expect(orderIdBelongsToUser("order_user_2_abc", "user_1")).toBe(false);
  });
});
