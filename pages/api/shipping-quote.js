export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { city, province, zip, address } = req.body;

  if (!city || !zip) {
    return res.status(400).json({ error: 'City and postal code are required.' });
  }

  const body = {
    collection_address: {
      type: 'business',
      company: 'R&R Agencies',
      street_address: '123 Your Street',
      local_area: 'Your Suburb',
      city: 'Verulam',
      zone: 'KwaZulu-Natal',
      country: 'ZA',
      code: '4340',
    },
    delivery_address: {
      type: 'residential',
      street_address: address || '',
      local_area: city,
      city: city,
      zone: province,
      country: 'ZA',
      code: zip,
    },
    parcels: [
      {
        length: 30,
        width: 20,
        height: 15,
        weight: 1,
      },
    ],
    declared_value: 0,
  };

  try {
    const response = await fetch('https://api.shiplogic.com/rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TCG_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('ShipLogic error:', data);
      return res.status(400).json({ error: data?.message || 'Quote failed' });
    }

    const rates = (data.rates || [])
      .filter((r) => r.rate > 0)
      .sort((a, b) => a.rate - b.rate)
      .map((r) => ({
        service: r.service_level?.name || r.service_level_code,
        code: r.service_level_code,
        price: parseFloat(r.rate.toFixed(2)),
        eta: r.estimated_delivery_date || null,
      }));

    return res.json({ rates });
  } catch (err) {
    console.error('TCG fetch error:', err);
    return res.status(500).json({ error: 'Shipping unavailable. Please try again.' });
  }
}
