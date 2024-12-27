import * as algoliasearch from 'algoliasearch';
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY, ALGOLIA_ADMIN_KEY } from '@env';

console.log('Algolia App ID:', ALGOLIA_APP_ID);

if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY || !ALGOLIA_ADMIN_KEY) {
  console.error('Missing Algolia environment variables!');
}

let searchIndex;
let adminIndex;

try {
  const searchClient = algoliasearch.default(
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_KEY
  );

  const adminClient = algoliasearch.default(
    ALGOLIA_APP_ID,
    ALGOLIA_ADMIN_KEY
  );

  // Test the connection
  adminClient.getApiKey(ALGOLIA_ADMIN_KEY).catch(error => {
    console.error('Algolia admin client connection test failed:', error);
  });

  searchIndex = searchClient.initIndex('users');
  adminIndex = adminClient.initIndex('users');

} catch (error) {
  console.error('Error initializing Algolia clients:', error);
  throw error;
}

export { searchIndex, adminIndex }; 