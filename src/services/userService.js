// Add this function to update dating profile fields
export const updateUserDatingProfile = async (userId, datingProfile) => {
  try {
    await firebase.firestore()
      .collection('users')
      .doc(userId)
      .update({
        datingProfile: {
          relationshipStatus: datingProfile.relationshipStatus,
          lookingFor: datingProfile.lookingFor,
          datingInterests: datingProfile.datingInterests || [],
          datePreferences: datingProfile.datePreferences || {},
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }
      });
    return true;
  } catch (error) {
    console.error('Error updating dating profile:', error);
    throw error;
  }
};

// Add this function to fetch dating profiles
export const getDatingProfiles = async () => {
  try {
    const snapshot = await firebase.firestore()
      .collection('users')
      .where('subscriptionType', '==', 'Self-Advocate - Dating')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching dating profiles:', error);
    throw error;
  }
}; 