export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { city, province, zip, address, suburb } = req.body;

  if (!city || !zip) {
    return res.status(400).json({ error: 'City and postal code are required.' });
  }

  const body = {
    collection_address: {
      type: 'business',
      company: 'R&R Agencies',
      street_address: '123 Your Street',
      local_area: 'Verulam',
      city: 'Verulam',
      zone: 'KwaZulu-Natal',
      country: 'ZA',
      code: '4340',
    },
    delivery_address: {
      type: 'residential',
      street_address: address || '',
      local_area: suburb || city,
      city: city,
      zone: province,
      country: 'ZA',
      code: zip,
    },
    parcels: [
      {
        submitted_length_cm: 30,
        submitted_width_cm: 20,
        submitted_height_cm: 15,
        submitted_weight_kg: 1,
      },
    ],
    declared_value: 500,
  };

  try {
    const response = await fetch('https://api.portal.thecourierguy.co.za/rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TCG_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('TCG raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('TCG returned non-JSON:', responseText);
      return res.status(500).json({ error: 'Courier API returned an invalid response.' });
    }

    if (!response.ok) {
      console.error('TCG error:', data);
      return res.status(400).json({ error: data?.message || 'Quote failed' });
    }

    const rates = (data.rates || [])
      .filter((r) => r.rate > 0)
      .sort((a, b) => a.rate - b.rate)
      .map((r) => ({
        service: r.service_level?.name || r.service_level_code,
        code: r.service_level?.name || r.service_level_code || r.service_level?.id,
        price: parseFloat(r.rate.toFixed(2)),
        eta: r.estimated_delivery_date || null,
      }));

    return res.json({ rates });
  } catch (err) {
    console.error('TCG fetch error:', err);
    return res.status(500).json({ error: 'Shipping unavailable. Please try again.' });
  }
}