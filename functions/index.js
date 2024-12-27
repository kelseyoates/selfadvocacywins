const functions = require('firebase-functions');
const algoliasearch = require('algoliasearch');

const client = algoliasearch(
  'YOUR_ALGOLIA_APP_ID',
  'YOUR_ALGOLIA_ADMIN_KEY'
);
const index = client.initIndex('users');

exports.syncUserToAlgolia = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userData = change.after.data();
    const userId = context.params.userId;

    // If user is deleted, remove from Algolia
    if (!userData) {
      await index.deleteObject(userId);
      return null;
    }

    // Prepare user data for Algolia
    const algoliaObject = {
      objectID: userId,
      username: userData.username,
      profilePicture: userData.profilePicture,
      state: userData.state,
      questionAnswers: userData.questionAnswers,
      // Calculate age from birthDate if you have it
      age: calculateAge(userData.birthDate),
      // Create searchable content from answers
      _searchableContent: userData.questionAnswers.map(qa => 
        `${qa.textAnswer} ${(qa.selectedWords || []).join(' ')}`
      ).join(' ')
    };

    // Save to Algolia
    await index.saveObject(algoliaObject);
    return null;
  });

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
} 