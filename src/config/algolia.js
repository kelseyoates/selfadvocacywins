import * as algoliasearch from 'algoliasearch';

const client = algoliasearch.default(
  '701AYQP8O7',
  'c8202bdda26c4c3ff8a71d6ca2582591'
);

const searchIndex = client.initIndex('users');

export { searchIndex }; 