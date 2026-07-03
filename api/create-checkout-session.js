const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const { items, origin, shippingAmount, delivery } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    const line_items = items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${item.name} (Size ${item.size})`,
          ...(item.notes ? { description: `Note: ${String(item.notes).slice(0, 400)}` } : {})
        },
        unit_amount: Math.round(Number(item.price) * 100)
      },
      quantity: Math.max(1, parseInt(item.qty, 10) || 1)
    }));

    const shipping = Math.max(0, Number(shippingAmount) || 0);
    const deliveryLabel = delivery && delivery.method === 'collect'
      ? `Free collection — ${delivery.pointName || 'Metro station'}`
      : 'Shipping';
    if (shipping > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: deliveryLabel },
          unit_amount: Math.round(shipping * 100)
        },
        quantity: 1
      });
    }

    const site = origin || 'https://www.nurael.co';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      success_url: `${site}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/cart.html`,
      shipping_address_collection: delivery && delivery.method === 'collect'
        ? undefined
        : { allowed_countries: ['US', 'CA', 'GB', 'AE', 'SA', 'AU'] },
      metadata: {
        cart: JSON.stringify(items.map((i) => ({ id: i.id, size: i.size, qty: i.qty, notes: i.notes || '' }))),
        delivery_method: (delivery && delivery.method) || 'ship',
        delivery_point: (delivery && delivery.pointName) || '',
        delivery_country: (delivery && delivery.countryCode) || ''
      }
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error', err);
    res.status(500).json({ error: err.message || 'Something went wrong' });
  }
};
