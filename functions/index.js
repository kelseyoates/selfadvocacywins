const functions = require("firebase-functions");
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const stripe = require("stripe")("sk_live_y5iqnq60z1CCYuD98ftQeUPw");
const Typesense = require("typesense");


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

// Initialize Typesense client
const client = new Typesense.Client({
  nodes: [{
    host: "e6dqryica24hsu75p-1.a1.typesense.net",
    port: "443",
    protocol: "https",
  }],
  apiKey: "vcXv0c4EKrJ6AHFR1nCKQSXGch2EEzE7",
  connectionTimeoutSeconds: 2,
});

/**
 * Creates a Typesense collection with the specified schema if it doesn't exist
 * @async
 * @return {Promise<void>}
 * A promise that resolves when the collection is created
 * @throws {Error}
 * If there's an error creating the collection (except 409 Conflict)
 */
async function createCollection() {
  const schema = {
    name: "users",
    fields: [
      {name: "username", type: "string"},
      {name: "state", type: "string"},
      {name: "subscriptionStatus", type: "string"},
      {name: "subscriptionType", type: "string"},
      {name: "age", type: "int32", optional: true},
      {
        name: "questionAnswers",
        type: "object[]",
        facet: true,
        fields: [
          {name: "textAnswer", type: "string", facet: true},
          {name: "selectedWords", type: "string[]", facet: true},
        ],
      },
      {name: "profilePicture", type: "string", optional: true},
      {name: "_searchableContent", type: "string", optional: true},
      {name: "matchScore", type: "float"},
    ],
    default_sorting_field: "matchScore",
    enable_nested_fields: true,
  };

  try {
    await client.collections().create(schema);
  } catch (error) {
    if (error.httpStatus !== 409) {
      throw error;
    }
    // Collection already exists
    console.log("Collection already exists");
  }
}

exports.onUserUpdateTypesense =
onDocumentWritten("users/{userId}", async (event) => {
  try {
    const userData = event.data.after.data();
    const userId = event.params.userId;

    if (!userData) {
      console.log("Document was deleted");
      try {
        await client.collections("users").documents(userId).delete();
      } catch (error) {
        console.log("Document not found in Typesense or already deleted");
      }
      return null;
    }

    console.log(`Processing Typesense index for user: ${userId}`);

    // Ensure collection exists
    await createCollection();

    // Prepare user data for Typesense
    const typesenseObject = {
      id: userId,
      subscriptionStatus: userData.subscriptionStatus,
      subscriptionType: userData.subscriptionType,
      username: userData.username,
      profilePicture: userData.profilePicture,
      state: userData.state,
      questionAnswers: userData.questionAnswers ?
        userData.questionAnswers.map((qa) => ({
          textAnswer: qa.textAnswer,
          selectedWords: qa.selectedWords || [],
        })) : [],
      age: calculateAge(userData.birthDate),
      _searchableContent: userData.questionAnswers ?
        userData.questionAnswers.map((qa) =>
          `${qa.textAnswer} ${(qa.selectedWords || []).join(" ")}`,
        ).join(" ") : "",
      matchScore: 1.0,
    };

    // Upsert to Typesense
    await client.collections("users").documents().upsert(typesenseObject);
    console.log(`Indexed user ${userId} to Typesense with data:`,
        typesenseObject);

    return null;
  } catch (error) {
    console.error("Error processing Typesense index:", error);
    throw error;
  }
});

/**
 * Calculates age from a birth date
 * @param {Date} birthDate -
 * The birth date to calculate age from
 * @return {number|null}
 * The calculated age or null if no birth date provided
 */
function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
