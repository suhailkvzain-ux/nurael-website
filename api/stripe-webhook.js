const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const config = {
  api: {
    bodyParser: false
  }
};

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const cartItems = JSON.parse((session.metadata && session.metadata.cart) || '[]');
      const total = (session.amount_total || 0) / 100;

      await supabase.from('orders').insert({
        customer_email: session.customer_details ? session.customer_details.email : null,
        items: cartItems,
        subtotal: total,
        shipping: 0,
        total,
        status: 'paid',
        stripe_session_id: session.id,
        shipping_address: session.customer_details ? session.customer_details.address : null
      });
    } catch (err) {
      console.error('Failed to record order', err);
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const meta = intent.metadata || {};
      const cartItems = JSON.parse(meta.cart || '[]');
      const subtotal = Number(meta.subtotal) || 0;
      const shipping = Number(meta.shipping) || 0;
      const total = (intent.amount_received || intent.amount || 0) / 100;

      await supabase.from('orders').insert({
        customer_email: meta.email || intent.receipt_email || null,
        items: cartItems,
        subtotal,
        shipping,
        total,
        status: 'paid',
        stripe_session_id: intent.id,
        shipping_address: meta.delivery_method === 'collect'
          ? { method: 'collect', point: meta.delivery_point }
          : { method: 'ship', country: meta.delivery_country }
      });
    } catch (err) {
      console.error('Failed to record order from payment intent', err);
    }
  }

  res.status(200).json({ received: true });
};

module.exports.config = config;
