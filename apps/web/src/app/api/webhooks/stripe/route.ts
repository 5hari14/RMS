import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@bites-rms/api";
import { prisma } from "@bites-rms/db";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const piId = paymentIntent.id;

        // Update the deposit record to CAPTURED
        await prisma.deposit.updateMany({
          where: { stripePaymentIntentId: piId },
          data: { status: "CAPTURED" },
        });

        console.log(`[stripe-webhook] Payment succeeded: ${piId}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const piId = paymentIntent.id;

        // Leave deposit as PENDING — the UI will show the failure
        console.error(
          `[stripe-webhook] Payment failed: ${piId}`,
          paymentIntent.last_payment_error?.message,
        );
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const piId = charge.payment_intent;

        if (typeof piId === "string") {
          await prisma.deposit.updateMany({
            where: { stripePaymentIntentId: piId },
            data: { status: "REFUNDED" },
          });
          console.log(`[stripe-webhook] Refund processed: ${piId}`);
        }
        break;
      }

      case "setup_intent.succeeded": {
        const setupIntent = event.data.object;
        const reservationId = setupIntent.metadata?.reservationId;
        const paymentMethodId =
          typeof setupIntent.payment_method === "string"
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id;

        if (reservationId && paymentMethodId) {
          // Store the payment method on a deposit record for future no-show charging
          await prisma.deposit.create({
            data: {
              amount: 0,
              currency: "USD",
              status: "PENDING",
              type: "deposit",
              stripeSetupIntentId: setupIntent.id,
              stripePaymentMethodId: paymentMethodId,
              reservationId,
            },
          });
          console.log(
            `[stripe-webhook] Setup intent succeeded for reservation ${reservationId}, pm: ${paymentMethodId}`,
          );
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
