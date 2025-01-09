const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")("sk_live_y5iqnq60z1CCYuD98ftQeUPw");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const webhookSecret = "whsec_BpV5SCNlIg7w78jKwlJyhXkXubvqCdm0";

  let event;

  try {
    const sig = req.headers["stripe-signature"];
    const rawBody = req.rawBody;

    if (!sig || !rawBody) {
      console.error("No signature or raw body found");
      return res.status(400).send("Missing signature or raw body");
    }

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log("Event constructed:", event.type);
    console.log("Event data:", event.data.object);

    const firestore = admin.firestore();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Full session data:", JSON.stringify(session, null, 2));

        if (session.promotion_code) {
          console.log("Promotion code used:", session.promotion_code);
        }
        if (session.total_details && session.total_details.breakdown) {
          console.log("Discount details:",
              session.total_details.breakdown.discounts);
        }
        if (session.discount) {
          console.log("Discount applied:", session.discount);
        }

        const userId = session.client_reference_id.toLowerCase();
        if (!userId) {
          console.error("No userId found in webhook data");
          return res.status(400).send("No userId found");
        }

        let subscriptionType = "unknown";
        switch (session.payment_link) {
          case "plink_1Qf6dRKsSm8QZ3xYyUmSeN60":
            subscriptionType = "selfAdvocatePlus";
            console.log("Matched Self Advocate Plus payment link");
            break;
          case "plink_1Qf6dKKsSm8QZ3xYZgKVuaKt":
            subscriptionType = "selfAdvocateDating";
            console.log("Matched Self Advocate Dating payment link");
            break;
          case "plink_1Qf6dMKsSm8QZ3xYBnyNxIjH":
            subscriptionType = "supporter1";
            console.log("Matched Supporter 1 payment link");
            break;
          case "plink_1Qf6iIKsSm8QZ3xYrAU4jqYR":
            subscriptionType = "supporter5";
            console.log("Matched Supporter 5 payment link");
            break;
          case "plink_1Qf6dBKsSm8QZ3xYTiufTvcC":
            subscriptionType = "supporter10";
            console.log("Matched Supporter 10 payment link");
            break;
          default:
            console.log("No payment link match found");
        }

        console.log("User ID:", userId);
        console.log("Subscription Type:", subscriptionType);
        console.log("Payment Link:", session.payment_link);

        const userDoc = await firestore.collection("users").doc(userId).get();
        if (!userDoc.exists) {
          await firestore.collection("users").doc(userId).set({
            subscriptionStatus: "active",
            subscriptionType,
            subscriptionId: session.subscription,
            customerId: session.customer,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log("Created new user document with subscription");
        } else {
          await firestore.collection("users").doc(userId).update({
            subscriptionStatus: "active",
            subscriptionType,
            subscriptionId: session.subscription,
            customerId: session.customer,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log("Updated existing user document");
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log("Subscription update received:", subscription);

        const usersRef = firestore.collection("users");
        const snapshot = await usersRef
            .where("customerId", "==", subscription.customer)
            .get();

        if (!snapshot.empty) {
          const userId = snapshot.docs[0].id;
          let subscriptionType = "selfAdvocateFree";

          switch (subscription.items.data[0].price.id) {
            case "price_1Qf6dRKsSm8QZ3xYVzYg8BSU":
              subscriptionType = "selfAdvocatePlus";
              console.log("Updated to Self Advocate Plus");
              break;
            case "price_1Qf6dKKsSm8QZ3xYzqXIqAVc":
              subscriptionType = "selfAdvocateDating";
              console.log("Updated to Self Advocate Dating");
              break;
            case "price_1Qf6dMKsSm8QZ3xYNjFNaI36":
              subscriptionType = "supporter1";
              console.log("Updated to Supporter 1");
              break;
            case "price_1Qf6cJKsSm8QZ3xYTbJYOL3P":
              subscriptionType = "supporter5";
              console.log("Updated to Supporter 5");
              break;
            case "price_1Qf6dBKsSm8QZ3xYMxoOPvH2":
              subscriptionType = "supporter10";
              console.log("Updated to Supporter 10");
              break;
            default:
              console.log("No matching price ID found for update");
          }

          await firestore.collection("users").doc(userId).update({
            subscriptionStatus: subscription.status,
            subscriptionType,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`Updated user ${userId} to ${subscriptionType}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log("Subscription deletion received:", subscription);

        const usersRef = firestore.collection("users");
        const snapshot = await usersRef
            .where("customerId", "==", subscription.customer)
            .get();

        if (!snapshot.empty) {
          const userId = snapshot.docs[0].id;
          await firestore.collection("users").doc(userId).update({
            subscriptionStatus: "canceled",
            subscriptionType: "selfAdvocateFree",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`Reset user ${userId} to free plan`);
        }
        break;
      }
    }

    return res.json({received: true});
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).send(`Webhook Error: ${error.message}`);
  }
});
