import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import {
  productForAmount,
  grantCreditsForTossPayment,
  verifyTossWebhookPayment,
  userIdFromOrderId
} from "@/lib/server/billing";
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
}).passthrough();

export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    const raw = JSON.parse(rawText);
    const body = tossWebhookSchema.parse(raw);
    const verifiedPayment = await verifyTossWebhookPayment(raw);

    if (verifiedPayment?.status && verifiedPayment.status !== "DONE") {
      return NextResponse.json({
        ignored: true,
        reason: `PAYMENT_${verifiedPayment.status}`,
        duplicate: false,
        creditsGranted: 0
      });
    }

    const paymentKey = verifiedPayment?.paymentKey ?? body.paymentKey ?? null;
    const orderId = verifiedPayment?.orderId ?? body.orderId ?? null;
    const amount = verifiedPayment?.amount ?? body.amount ?? 29000;
    const user = await resolveWebhookUser(request, {
      orderId,
      userId: verifiedPayment ? userIdFromOrderId(orderId) : body.userId
    });
    const productId = body.productId ?? productForAmount(amount);

    const payload = await mutateStore((data) => {
      return grantCreditsForTossPayment(data, {
        userId: user.id,
        paymentKey,
        orderId,
        productId,
        raw: verifiedPayment?.raw ?? raw
      });
    });

    return NextResponse.json(payload);
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}

async function resolveWebhookUser(
  request: Request,
  input: { orderId: string | null; userId?: string | null }
): Promise<{ id: string }> {
  if (input.userId) {
    return { id: input.userId };
  }
  return await userFromOrderId(input.orderId) ?? await resolveRequestUser(request);
}

async function userFromOrderId(orderId: string | null): Promise<{ id: string } | null> {
  const userId = userIdFromOrderId(orderId);
  if (!userId) {
    return null;
  }
  const data = await readStore();
  return data.users.some((user) => user.id === userId) ? { id: userId } : null;
}
