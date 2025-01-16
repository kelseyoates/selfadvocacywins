const functions = require("firebase-functions");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
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

// Initialize Typesense client with proper credentials
const client = new Typesense.Client({
  nodes: [{
    host: "e6dqryica24hsu75p-1.a1.typesense.net", // Use your actual host
    port: "443",
    protocol: "https",
  }],
  apiKey: "vcXv0c4EKrJ6AHFR1nCKQSXGch2EEzE7", // Use your actual API key
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
      {name: "age_str", type: "string", optional: true},
      {name: "age_sort", type: "float", optional: true, facet: true},
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
    // First, try to delete the existing collection
    try {
      await client.collections("users").delete();
      console.log("Deleted existing collection");
    } catch (deleteError) {
      console.log("No existing collection to delete");
    }

    // Create new collection with updated schema
    await client.collections().create(schema);
    console.log("Created new collection with schema");
    return true;
  } catch (error) {
    console.error("Error in createCollection:", error);
    throw error;
  }
}

exports.onUserUpdateTypesense = onDocumentUpdated("users/{userId}",
    async (event) => {
      try {
        const userId = event.params.userId;

        // Directly fetch the current Firestore document
        const firestore = admin.firestore();
        const userDoc = await firestore.collection("users").doc(userId).get();
        const userData = userDoc.data();

        // Handle age values
        const ageNumber = parseInt(userData.age || 0, 10);
        const ageString = ageNumber.toString();

        console.log("Processing age:", {
          original: userData.age,
          asNumber: ageNumber,
          asString: ageString,
        });

        const typesenseObject = {
          id: userId,
          subscriptionStatus: userData.subscriptionStatus || "inactive",
          subscriptionType: userData.subscriptionType || "selfAdvocateFree",
          username: userData.username || "",
          profilePicture: userData.profilePicture || "",
          state: userData.state || "",
          age_str: ageString,
          age_sort: ageNumber,
          questionAnswers: userData.questionAnswers || [],
          _searchableContent: userData.questionAnswers ?
            userData.questionAnswers.map((qa) =>
              `${qa.textAnswer || ""} ${(qa.selectedWords || []).join(" ")}`,
            ).join(" ") : "",
          matchScore: 1.0,
        };

        try {
          await client.collections("users").documents().upsert(typesenseObject);
          console.log("Updated Typesense with age values:", {
            age_str: ageString,
            age_sort: ageNumber,
          });
        } catch (typesenseError) {
          console.error("Typesense update failed:", typesenseError);
          throw typesenseError;
        }

        return null;
      } catch (error) {
        console.error("Error in onUserUpdateTypesense:", error);
        throw error;
      }
    });

exports.migrateUsersToTypesense = functions.https.onRequest(
    async (req, res) => {
      try {
        await createCollection();
        const firestore = admin.firestore();
        const usersSnapshot = await firestore.collection("users").get();

        console.log(`Found ${usersSnapshot.size} users to migrate`);

        const batchPromises = usersSnapshot.docs.map(async (doc) => {
          const userData = doc.data();
          const userId = doc.id;

          console.log(`\nProcessing user ${userId}:`);
          console.log("User data:", userData);
          console.log("Age from Firestore:", userData.age);

          const typesenseObject = {
            id: userId,
            subscriptionStatus: userData.subscriptionStatus || "inactive",
            subscriptionType: userData.subscriptionType || "selfAdvocateFree",
            username: userData.username || "",
            profilePicture: userData.profilePicture || "",
            state: userData.state || "",
            age: userData.age || 0,
            questionAnswers: userData.questionAnswers ?
              userData.questionAnswers.map((qa) => ({
                textAnswer: qa.textAnswer || "",
                selectedWords: qa.selectedWords || [],
              })) : [],
            _searchableContent: userData.questionAnswers ?
              userData.questionAnswers.map((qa) => {
                const textAnswer = qa.textAnswer || "";
                const words = (qa.selectedWords || []).join(" ");
                return `${textAnswer} ${words}`;
              }).join(" ") : "",
            matchScore: 1.0,
          };

          console.log("Typesense object:", typesenseObject);

          try {
            await client.collections("users")
                .documents()
                .upsert(typesenseObject);
            return {
              success: true,
              userId,
              age: userData.age,
            };
          } catch (error) {
            console.error(`Failed to migrate user ${userId}:`, error);
            return {
              success: false,
              userId,
              error: error.message,
            };
          }
        });

        const results = await Promise.all(batchPromises);
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        res.json({
          message: "Migration completed",
          total: usersSnapshot.size,
          successful,
          failed,
          results,
        });
      } catch (error) {
        console.error("Migration failed:", error);
        res.status(500).json({error: error.message});
      }
    });

// Add this to force recreation of the collection
exports.recreateTypesenseCollection = functions.https.onRequest(
    async (req, res) => {
      try {
        await createCollection();
        res.json({message: "Collection recreated successfully"});
      } catch (error) {
        console.error("Error recreating collection:", error);
        res.status(500).json({error: error.message});
      }
    });
