import Typesense from 'typesense';

export const typesenseClient = new Typesense.Client({
  nodes: [{
    host: 'e6dqryica24hsu75p-1.a1.typesense.net',
    port: '443',
    protocol: 'https',
  }],
  apiKey: 'vcXv0c4EKrJ6AHFR1nCKQSXGch2EEzE7',
  connectionTimeoutSeconds: 5,
  retryIntervalSeconds: 0.5,
  numRetries: 2,
  cacheTTLSeconds: 60,
  useServerSideSearchCache: true,
}); 