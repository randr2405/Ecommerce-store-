import md5 from 'md5';

export async function POST(req) {
  const { form, subtotal } = await req.json();

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const data = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `\${siteUrl}/checkout/success`,
    cancel_url: `\${siteUrl}/cart`,
    notify_url: `\${siteUrl}/api/payfast-notify`,
    name_first: form.firstName,
    name_last: form.lastName,
    email_address: form.email,
    cell_number: form.phone,
    amount: subtotal,
    item_name: 'RnR Agencies Order',
  };

  const pfParamString = Object.entries(data)
    .filter(([, v]) => String(v ?? '').trim() !== '')
    .map(([k, v]) => `\${k}=\${encodeURIComponent(String(v).trim()).replace(/%20/g, '+')}`)
    .join('&');

  data.signature = md5(pfParamString);

  return Response.json(data);
}
