const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")("sk_test_5iwXahUlMmEEjqQkE4KddFI2");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, stripe-signature");

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
        "whsec_45TCT7uHzJFBfykkOEdguj61OFuQLIn2",
    );

    console.log("Event constructed:", event.type);
    console.log("Event data:", event.data.object);

    const firestore = admin.firestore();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Full session data:", JSON.stringify(session, null, 2));

        const userId = session.client_reference_id.toLowerCase();
        if (!userId) {
          console.error("No userId found in webhook data");
          return res.status(400).send("No userId found");
        }

        let subscriptionType = "unknown";
        switch (session.payment_link) {
          case "plink_1Qcy2qKsSm8QZ3xYMlW2WoT7":
            subscriptionType = "selfAdvocatePlus";
            console.log("Matched Self Advocate Plus payment link");
            break;
          case "plink_1Qf4nbKsSm8QZ3xYk9Rvuszt":
            subscriptionType = "selfAdvocateDating";
            console.log("Matched Self Advocate Dating payment link");
            break;
          case "plink_1Qcy3hKsSm8QZ3xYbacu5Dtd":
            subscriptionType = "supporter1";
            console.log("Matched Supporter 1 payment link");
            break;
          case "plink_1Qf4qhKsSm8QZ3xYs07CpFKw":
            subscriptionType = "supporter5";
            console.log("Matched Supporter 5 payment link");
            break;
          case "plink_1Qf4tkKsSm8QZ3xYVyhUiT08":
            subscriptionType = "supporter10";
            console.log("Matched Supporter 10 payment link");
            break;
          default:
            console.log("No payment link match found");
        }

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
            case "price_1QcoKMKsSm8QZ3xYMdZytQWI":
              subscriptionType = "selfAdvocatePlus";
              console.log("Updated to Self Advocate Plus");
              break;
            case "price_1Qf4mcKsSm8QZ3xYD8Hh8rzt":
              subscriptionType = "selfAdvocateDating";
              console.log("Updated to Self Advocate Dating");
              break;
            case "price_1QZDoHKsSm8QZ3xYSkYVFVKW":
              subscriptionType = "supporter1";
              console.log("Updated to Supporter 1");
              break;
            case "price_1Qf4pmKsSm8QZ3xY0C3Fwxif":
              subscriptionType = "supporter5";
              console.log("Updated to Supporter 5");
              break;
            case "price_1Qf4f8KsSm8QZ3xYiuh0anYD":
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
    console.error("Error processing webhook:", error, error.stack);
    return res.status(500).send(`Webhook processing failed: ${error.message}`);
  }
});
