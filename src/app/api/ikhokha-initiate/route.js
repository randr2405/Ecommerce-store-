import crypto from 'crypto';

export async function POST(req) {
  const { form, subtotal } = await req.json();

  const APP_ID     = process.env.IKHOKHA_APP_ID;
  const APP_SECRET = process.env.IKHOKHA_APP_SECRET;
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL;

  const payload = {
    entityID:              APP_ID,
    amount:                Math.round(parseFloat(subtotal) * 100),
    currency:              'ZAR',
    requesterUrl:          siteUrl,
    externalTransactionID: `RNR-${Date.now()}`,
    urls: {
      successPageUrl: `${siteUrl}/checkout/success`,
      failurePageUrl: `${siteUrl}/cart`,
      cancelUrl:      `${siteUrl}/cart`,
      callbackUrl:    `${siteUrl}/api/ikhokha-webhook`,
    }
  };

  const bodyString = JSON.stringify(payload);

  const signature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(bodyString)
    .digest('hex');

  // Try both possible endpoint URLs
  const response = await fetch('https://api.ikhokha.com/applications/paymentlink', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'IK-AppID':     APP_ID,
      'ik-sign':      signature,
    },
    body: bodyString,
  });

  const rawText = await response.text();
  console.log('iKhokha status:', response.status);
  console.log('iKhokha response:', rawText);

  let data;
  try { data = JSON.parse(rawText); } catch { data = { message: rawText }; }

  if (data.paylinkUrl) {
    return Response.json({ paymentUrl: data.paylinkUrl });
  } else {
    return Response.json({ error: data.message || rawText, status: response.status }, { status: 400 });
  }
}