import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const statusMessages = {
  processing: {
    subject: "Your Order is Being Processed — R&R Agencies",
    heading: "Order Processing",
    message: "Great news! We have received your order and it is currently being prepared.",
    color: "#C9A84C",
  },
  shipped: {
    subject: "Your Order is On Its Way! — R&R Agencies",
    heading: "Order Shipped",
    message: "Your order has been dispatched and is on its way to you. Keep an eye out for your delivery!",
    color: "#7ab4d4",
  },
  delivered: {
    subject: "Your Order Has Been Delivered — R&R Agencies",
    heading: "Order Delivered",
    message: "Your order has been delivered. We hope you love your purchase! Feel free to reach out if you have any questions.",
    color: "#7ec87e",
  },
  cancelled: {
    subject: "Your Order Has Been Cancelled — R&R Agencies",
    heading: "Order Cancelled",
    message: "Your order has been cancelled. If you have any questions or believe this is a mistake, please contact us.",
    color: "#e07070",
  },
};

export async function POST(req) {
  try {
    const { order, status } = await req.json();

    const template = statusMessages[status];
    if (!template) return Response.json({ ok: false, reason: "no template for status" });

    const itemsHtml = (order.cart || []).map(item => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#ccc;font-family:Georgia,serif;">
          ${item.name} ${item.size ? `<span style="color:#666;font-size:12px;">· ${item.size}</span>` : ""}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#666;font-size:13px;text-align:center;">
          x${item.quantity}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#C9A84C;text-align:right;font-family:Georgia,serif;">
          R ${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join("");

    const addressHtml = order.address && order.address.line1 ? `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#555;">Delivery Address</p>
        <p style="margin:0;font-size:13px;color:#888;line-height:1.8;">
          ${order.address.line1}${order.address.line2 ? `, ${order.address.line2}` : ""}<br/>
          ${order.address.city}${order.address.province ? `, ${order.address.province}` : ""} ${order.address.postal || ""}
        </p>
      </div>
    ` : "";

    const shippingHtml = order.shippingService ? `
      <p style="color:#666;font-size:13px;margin:0 0 24px;">
        Shipping: <span style="color:#888;">${order.shippingService} · ${parseFloat(order.shippingCost) > 0 ? `R ${parseFloat(order.shippingCost).toFixed(2)}` : "FREE"}</span>
      </p>
    ` : "";

    await transporter.sendMail({
      from: `"R&R Agencies" <${process.env.GMAIL_USER}>`,
      to: order.email,
      subject: template.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:580px;margin:0 auto;background:#0F0F0F;border:1px solid rgba(201,168,76,0.2);">
            <div style="background:#0A0A0A;padding:40px 48px;text-align:center;border-bottom:1px solid rgba(201,168,76,0.15);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#C9A84C;font-family:Georgia,serif;">R&amp;R AGENCIES</p>
              <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#F5F0E8;letter-spacing:0.05em;">${template.heading}</h1>
              <div style="width:32px;height:2px;background:${template.color};margin:16px auto 0;"></div>
            </div>
            <div style="padding:40px 48px;">
              <p style="color:#888;font-size:14px;line-height:1.8;margin:0 0 8px;">Hi ${order.name?.split(" ")[0] || "there"},</p>
              <p style="color:#888;font-size:14px;line-height:1.8;margin:0 0 28px;">${template.message}</p>
              <div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.15);padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;">Order Reference</p>
                <p style="margin:0;font-family:Georgia,serif;font-size:17px;color:#F5F0E8;">#${order.paymentId || order.id?.slice(-8).toUpperCase()}</p>
              </div>
              ${addressHtml}
              ${shippingHtml}
              ${(order.cart?.length > 0) ? `
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <thead>
                  <tr>
                    <th style="text-align:left;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#555;padding-bottom:10px;border-bottom:1px solid rgba(201,168,76,0.2);">Item</th>
                    <th style="text-align:center;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#555;padding-bottom:10px;border-bottom:1px solid rgba(201,168,76,0.2);">Qty</th>
                    <th style="text-align:right;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#555;padding-bottom:10px;border-bottom:1px solid rgba(201,168,76,0.2);">Price</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <div style="text-align:right;margin-bottom:28px;">
                <span style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#555;">Total Paid: </span>
                <span style="font-family:Georgia,serif;font-size:20px;color:#C9A84C;">R ${parseFloat(order.amount || 0).toFixed(2)}</span>
              </div>
              ` : ""}
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

    console.log(`Status email (${status}) sent to:`, order.email);
    return Response.json({ ok: true });

  } catch (err) {
    console.error("Status email failed:", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
