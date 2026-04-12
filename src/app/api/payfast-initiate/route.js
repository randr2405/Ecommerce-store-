import md5 from 'md5';

export async function POST(req) {
  const { form, subtotal } = await req.json();

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const pfData = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${siteUrl}/checkout/success`,
    cancel_url: `${siteUrl}/cart`,
    notify_url: `${siteUrl}/api/payfast-notify`,
    name_first: form.firstName,
    name_last: form.lastName,
    email_address: form.email,
    cell_number: form.phone,
    amount: subtotal,
    item_name: 'RnR Agencies Order',
  };

  const pfParamString = Object.entries(pfData)
    .filter(([key, val]) => key !== 'merchant_key' && String(val ?? '').trim() !== '')
    .map(([key, val]) => `${key}=${encodeURIComponent(String(val).trim()).replace(/%20/g, '+')}`)
    .join('&')
    + `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;

  pfData.signature = md5(pfParamString);

  // TEMP: return param string for debugging
  return Response.json({ ...pfData, _debug_paramString: pfParamString });
}