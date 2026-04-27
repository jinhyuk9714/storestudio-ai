import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import { resolveRequestUser } from "@/lib/server/auth";
import { PRODUCT_CATALOG } from "@/lib/server/billing";

const checkoutSchema = z.object({
  productId: z.literal("starter_30").default("starter_30")
});

export async function POST(request: Request) {
  try {
    const body = checkoutSchema.parse(await request.json().catch(() => ({})));
    const user = await resolveRequestUser(request);
    const product = PRODUCT_CATALOG[body.productId];
    const orderId = `order_${user.id}_${randomUUID()}`;

    return NextResponse.json({
      orderId,
      orderName: product.name,
      productId: product.id,
      amount: product.amount,
      currency: product.currency,
      credits: product.credits,
      customerEmail: user.email
    });
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}
