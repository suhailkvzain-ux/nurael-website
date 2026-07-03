const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const { items, shippingAmount, delivery, email } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (parseInt(item.qty, 10) || 1), 0);
    const shipping = Math.max(0, Number(shippingAmount) || 0);
    const total = subtotal + shipping;

    if (total <= 0) {
      res.status(400).json({ error: 'Invalid order total' });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'usd',
      receipt_email: email || undefined,
      automatic_payment_methods: { enabled: true },
      metadata: {
        cart: JSON.stringify(items.map((i) => ({ id: i.id, size: i.size, qty: i.qty, notes: i.notes || '' }))),
        subtotal: subtotal.toFixed(2),
        shipping: shipping.toFixed(2),
        delivery_method: (delivery && delivery.method) || 'ship',
        delivery_point: (delivery && delivery.pointName) || '',
        delivery_country: (delivery && delivery.countryCode) || '',
        email: email || ''
      }
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('create-payment-intent error', err);
    res.status(500).json({ error: err.message || 'Something went wrong' });
  }
};
