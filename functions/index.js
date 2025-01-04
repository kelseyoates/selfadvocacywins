const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")("sk_test_5iwXahUlMmEEjqQkE4KddFI2");

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Simplified version without region
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  // Add CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, stripe-signature");

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  console.log("Webhook received with headers:", req.headers);
  console.log("Request path:", req.path);

  try {
    const event = await stripe.webhooks.constructEvent(
        req.rawBody || req.body,
        req.headers["stripe-signature"],
        "whsec_StS3fmJ8hA1fvbNnKtodssZcPDqSBfoE",
    );

    console.log("Event constructed:", event.type);
    console.log("Event data:", event.data.object);

    const session = event.data.object;

    // Log the full session object to see what we're getting
    console.log("Full session data:", JSON.stringify(session, null, 2));
    console.log("Session metadata:", session.metadata);

    const userId = session.client_reference_id.toLowerCase();
    console.log("User ID from session (lowercase):", userId);

    if (!userId) {
      console.error("No userId found in webhook data");
      return res.status(400).send("No userId found");
    }

    // Debug log the payment link
    console.log("Payment link from session:", session.payment_link);

    // Get subscription type based on payment link ID
    let subscriptionType = "unknown";

    switch (session.payment_link) {
      case "plink_1Qcy2qKsSm8QZ3xYMlW2WoT7":
        subscriptionType = "selfAdvocatePlus";
        console.log("Matched Self Advocate Plus payment link");
        break;
      case "plink_1Qcy3HKsSm8QZ3xY8CXish4i":
        subscriptionType = "selfAdvocateDating";
        console.log("Matched Self Advocate Dating payment link");
        break;
      case "plink_1Qcy3hKsSm8QZ3xYbacu5Dtd":
        subscriptionType = "supporter1";
        console.log("Matched Supporter 1 payment link");
        break;
      case "plink_1Qcy43KsSm8QZ3xYyj686UkD":
        subscriptionType = "supporter5";
        console.log("Matched Supporter 5 payment link");
        break;
      case "plink_1Qcy4QKsSm8QZ3xYp3aXfVVT":
        subscriptionType = "supporter10";
        console.log("Matched Supporter 10 payment link");
        break;
      default:
        console.log("No payment link match found");
    }

    console.log("Determined subscription type:", subscriptionType);

    // Update Firestore
    const db = admin.firestore();

    // Check if document exists
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      // Create new document if it doesn't exist
      await db.collection("users").doc(userId).set({
        subscriptionStatus: "active",
        subscriptionType,
        subscriptionId: session.subscription,
        customerId: session.customer,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Created new user document with subscription");
    } else {
      // Update existing document
      await db.collection("users").doc(userId).update({
        subscriptionStatus: "active",
        subscriptionType,
        subscriptionId: session.subscription,
        customerId: session.customer,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Updated existing user document");
    }

    console.log("Successfully handled user subscription in Firestore");
    return res.json({received: true});
  } catch (error) {
    console.error("Error processing webhook:", error, error.stack);
    return res.status(500).send(`Webhook processing failed: 
      ${error.message}`);
  }
});