import { getDb } from "@/lib/firebase-admin";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function GET() {
  return new Response("OK", { status: 200 });
}

export async function POST(req) {
  const body = await req.text();
  const params = Object.fromEntries(new URLSearchParams(body));

  if (params.payment_status !== "COMPLETE") {
    return new Response("ignored", { status: 200 });
  }

  const db = getDb();

  const pendingSnap = await db
    .collection("pendingOrders")
    .where("email_address", "==", params.email_address)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  let cart = [], shippingService = "", shippingCost = 0, userId = null;

  if (!pendingSnap.empty) {
    const pending = pendingSnap.docs[0].data();
    cart = pending.cart || [];
    shippingService = pending.shippingService || "";
    shippingCost = pending.shippingCost || 0;
    userId = pending.userId || null;
    await pendingSnap.docs[0].ref.delete();
  }

  await db.collection("orders").add({
    paymentId: params.pf_payment_id,
    email: params.email_address,
    name: `${params.name_first} ${params.name_last}`,
    amount: params.amount_gross,
    status: "paid",
    cart,
    shippingService,
    shippingCost,
    userId,
    createdAt: new Date(),
  });

  const itemsHtml = cart.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#ccc;font-family:Georgia,serif;">
        ${item.name} ${item.size ? `<span style="color:#666;font-size:12px;">· ${item.size}</span>` : ""}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#666;font-size:13px;text-align:center;">
        x${item.quantity}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#C9A84C;text-align:right;font-family:Georgia,serif;">
        R ${(item.price * item.quantity).toFixed(2)}
      </td>
    </tr>
  `).join("");

  const shippingRow = parseFloat(shippingCost) > 0
    ? `<tr><td colspan="2" style="padding:10px 0;color:#666;font-size:13px;">Shipping · ${shippingService}</td><td style="padding:10px 0;color:#666;text-align:right;">R ${parseFloat(shippingCost).toFixed(2)}</td></tr>`
    : `<tr><td colspan="2" style="padding:10px 0;color:#7ec87e;font-size:13px;">Shipping</td><td style="padding:10px 0;color:#7ec87e;text-align:right;">FREE</td></tr>`;

  try {
    await transporter.sendMail({
      from: `"R&R Agencies" <${process.env.GMAIL_USER}>`,
      to: params.email_address,
      bcc: process.env.GMAIL_USER,
      subject: "Order Confirmed — R&R Agencies",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:580px;margin:0 auto;background:#0F0F0F;border:1px solid rgba(201,168,76,0.2);">
            
            <div style="background:#0A0A0A;padding:40px 48px;text-align:center;border-bottom:1px solid rgba(201,168,76,0.15);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#C9A84C;font-family:Georgia,serif;">R&amp;R AGENCIES</p>
              <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#F5F0E8;letter-spacing:0.05em;">Order Confirmed</h1>
              <div style="width:32px;height:1px;background:#C9A84C;margin:16px auto 0;"></div>
            </div>

            <div style="padding:40px 48px;">
              <p style="color:#888;font-size:14px;line-height:1.8;margin:0 0 8px;">Hi ${params.name_first},</p>
              <p style="color:#888;font-size:14px;line-height:1.8;margin:0 0 32px;">Thank you for your order. We've received your payment and will be in touch once your order has been dispatched.</p>

              <div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.15);padding:16px 20px;margin-bottom:32px;">
                <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;">Payment Reference</p>
                <p style="margin:6px 0 0;font-family:Georgia,serif;font-size:18px;color:#F5F0E8;">#${params.pf_payment_id}</p>
              </div>

              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <thead>
                  <tr>
                    <th style="text-align:left;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#555;padding-bottom:12px;border-bottom:1px solid rgba(201,168,76,0.2);">Item</th>
                    <th style="text-align:center;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#555;padding-bottom:12px;border-bottom:1px solid rgba(201,168,76,0.2);">Qty</th>
                    <th style="text-align:right;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#555;padding-bottom:12px;border-bottom:1px solid rgba(201,168,76,0.2);">Price</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>

              <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
                ${shippingRow}
                <tr>
                  <td colspan="2" style="padding:14px 0 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;border-top:1px solid rgba(201,168,76,0.15);">Total Paid</td>
                  <td style="padding:14px 0 0;font-family:Georgia,serif;font-size:22px;color:#C9A84C;text-align:right;border-top:1px solid rgba(201,168,76,0.15);">R ${parseFloat(params.amount_gross).toFixed(2)}</td>
                </tr>
              </table>

              <p style="color:#666;font-size:13px;line-height:1.8;margin:0;">Questions? Contact us at <a href="mailto:randr2405@gmail.com" style="color:#C9A84C;text-decoration:none;">randr2405@gmail.com</a></p>
            </div>

            <div style="padding:24px 48px;border-top:1px solid rgba(201,168,76,0.1);text-align:center;">
              <p style="margin:0;font-size:11px;color:#444;letter-spacing:0.1em;">R&amp;R AGENCIES · South Africa</p>
            </div>

          </div>
        </body>
        </html>
      `,
    });
    console.log("Email sent to:", params.email_address);
  } catch (err) {
    console.error("Email send failed:", err.message);
  }

  return new Response("OK", { status: 200 });
}