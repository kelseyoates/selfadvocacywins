const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Get stripe key from Firebase config
const stripeSecret = functions.config().stripe.secret_key;
const stripe = require("stripe")(stripeSecret);

/**
 * Creates a Stripe checkout session
 */
exports.createCheckoutSession =
functions.https.onRequest(async (request, response) => {
  // Enable CORS
  response.set("Access-Control-Allow-Origin", "*");

  if (request.method === "OPTIONS") {
    response.set("Access-Control-Allow-Methods", "POST");
    response.set("Access-Control-Allow-Headers", "Content-Type");
    response.status(204).send("");
    return;
  }

  try {
    const {priceId} = request.body;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: "selfadvocacywins://payment-success",
      cancel_url: "selfadvocacywins://payment-cancelled",
    });

    response.json({url: session.url});
  } catch (error) {
    console.error("Stripe session creation error:", error);
    response.status(500).json({
      error: "Failed to create checkout session",
    });
  }
});

/**
 * Handles Stripe webhook events
 */
exports.stripeWebhook = functions.https.onRequest(async (request, response) => {
  const sig = request.headers["stripe-signature"];
  const endpointSecret = functions.config().stripe.webhook_secret;

  try {
    const event = stripe.webhooks.constructEvent(
        request.rawBody || request.body,
        sig,
        endpointSecret,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await updateUserSubscription(session.client_reference_id);
    }

    response.json({received: true});
  } catch (err) {
    console.error("Webhook Error:", err.message);
    response.status(400).send(`Webhook Error: ${err.message}`);
  }
});

/**
 * Updates the user's subscription status in Firestore
 * @param {string} userId - The user's ID
 * @return {Promise<void>}
 */
async function updateUserSubscription(userId) {
  const db = admin.firestore();
  await db.collection("users").doc(userId).update({
    isSubscribed: true,
    subscriptionDate: admin.firestore.FieldValue.serverTimestamp(),
  });
}
