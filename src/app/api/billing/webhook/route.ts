import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import { productForAmount, grantCreditsForTossPayment } from "@/lib/server/billing";
import { resolveRequestUser } from "@/lib/server/auth";
import { mutateStore, readStore } from "@/lib/server/store";

const tossWebhookSchema = z.object({
  eventType: z.string().default("PAYMENT_APPROVED"),
  paymentKey: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  credits: z.number().int().positive().optional(),
  productId: z.literal("starter_30").optional(),
  userId: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const body = tossWebhookSchema.parse(raw);
    const user = body.userId
      ? { id: body.userId }
      : await userFromOrderId(body.orderId ?? null) ?? await resolveRequestUser(request);
    const productId = body.productId ?? productForAmount(body.amount ?? 29000);

    const payload = await mutateStore((data) => {
      return grantCreditsForTossPayment(data, {
        userId: user.id,
        paymentKey: body.paymentKey ?? null,
        orderId: body.orderId ?? null,
        productId,
        raw
      });
    });

    return NextResponse.json(payload);
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}

async function userFromOrderId(orderId: string | null): Promise<{ id: string } | null> {
  if (!orderId?.startsWith("order_user_")) {
    return null;
  }

  const parts = orderId.split("_");
  parts.pop();
  const userId = parts.slice(1).join("_");
  const data = await readStore();
  return data.users.some((user) => user.id === userId) ? { id: userId } : null;
}
