import crypto from 'crypto';

export async function POST(req) {
  const { form, subtotal } = await req.json();

  const APP_ID     = 'IK97LS8FCWSNCFFG5H5BAOVG0TQJQRXV';
  const APP_SECRET = 'wHw4IqPgZ16BK01r8eQaXCkTa3THeFhw';
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL;

  const payload = {
    entityID:             APP_ID,
    amount:               Math.round(parseFloat(subtotal) * 100), // rands → cents
    currency:             'ZAR',
    requesterUrl:         siteUrl,
    externalTransactionID: `RNR-${Date.now()}`,
    urls: {
      successPageUrl: `${siteUrl}/checkout/success`,
      failurePageUrl: `${siteUrl}/checkout/failed`,
      cancelUrl:      `${siteUrl}/cart`,
      callbackUrl:    `${siteUrl}/api/ikhokha-webhook`,
    }
  };

  const bodyString = JSON.stringify(payload);

  const signature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(bodyString)
    .digest('hex');

  const response = await fetch('https://api.ikhokha.com/api/paymentLink', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'IK-AppID':     APP_ID,
      'ik-sign':      signature,
    },
    body: bodyString,
  });

  const data = await response.json();

  if (data.responseCode === '00' && data.paylinkUrl) {
    return Response.json({ paymentUrl: data.paylinkUrl });
  } else {
    return Response.json(
      { error: data.message || 'Failed to create payment link' },
      { status: 400 }
    );
  }
}