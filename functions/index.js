const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")("sk_test_5iwXahUlMmEEjqQkE4KddFI2");

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Simplified version without any CPU or memory settings
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  console.log("Webhook received");

  try {
    const event = await stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers["stripe-signature"],
        "we_1QcuuLKsSm8QZ3xYEUWRJgq2",
    );

    const session = event.data.object;
    const userId = session.client_reference_id;

    if (!userId) {
      console.error("No userId found in webhook data");
      return res.status(400).send("No userId found");
    }

    // Update Firestore
    const db = admin.firestore();
    const planType =
    session.metadata &&
    session.metadata.planType ? session.metadata.planType : "unknown";

    await db.collection("users").doc(userId).update({
      subscriptionStatus: "active",
      subscriptionType: planType,
      subscriptionId: session.subscription,
      customerId: session.customer,
    });

    console.log("Successfully updated user subscription in Firestore");
    return res.json({received: true});
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).send("Webhook processing failed");
  }
});
