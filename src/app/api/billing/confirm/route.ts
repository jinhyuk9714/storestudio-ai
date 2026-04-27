import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import { resolveRequestUser } from "@/lib/server/auth";
import {
  confirmTossPayment,
  grantCreditsForTossPayment,
  productForAmount
} from "@/lib/server/billing";
import { mutateStore } from "@/lib/server/store";

const confirmSchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive()
});

export async function POST(request: Request) {
  try {
    const body = confirmSchema.parse(await request.json());
    const user = await resolveRequestUser(request);
    const productId = productForAmount(body.amount);
    const raw = await confirmTossPayment(body);
    const payload = await mutateStore((data) =>
      grantCreditsForTossPayment(data, {
        userId: user.id,
        paymentKey: body.paymentKey,
        orderId: body.orderId,
        productId,
        raw
      })
    );

    return NextResponse.json(payload);
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}
