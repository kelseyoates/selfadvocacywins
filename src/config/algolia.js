import algoliasearch from 'algoliasearch';
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY, ALGOLIA_ADMIN_KEY } from '@env';

console.log('Algolia App ID:', ALGOLIA_APP_ID);

if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY || !ALGOLIA_ADMIN_KEY) {
  console.error('Missing Algolia environment variables!');
}

let searchIndex;
let adminIndex;

try {
  const searchClient = algoliasearch(
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_KEY
  );

  const adminClient = algoliasearch(
    ALGOLIA_APP_ID,
    ALGOLIA_ADMIN_KEY
  );

  // Test the connection
  adminClient.getApiKey(ALGOLIA_ADMIN_KEY).catch(error => {
    console.error('Algolia admin client connection test failed:', error);
  });

  searchIndex = searchClient.initIndex('users_friends');
  adminIndex = adminClient.initIndex('users_friends');

} catch (error) {
  console.error('Error initializing Algolia clients:', error);
  throw error;
}

const updateAlgoliaSettings = async () => {
  try {
    await adminIndex.setSettings({
      searchableAttributes: [
        'winTopics',
        'questionAnswers',
        'username',
        'state'
      ],
      attributesForFaceting: [
        'state',
        'winTopics',
        'questionAnswers'
      ]
    });
    console.log('Algolia settings updated successfully');
  } catch (error) {
    console.error('Error updating Algolia settings:', error);
  }
};

export { searchIndex, adminIndex }; 