import Redis from 'ioredis';

const redisConnection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASS || undefined,
    username: process.env.REDIS_USER || 'default',
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy: (times) => {
        // Exponential backoff retry strategy up to 3 seconds
        return Math.min(times * 500, 3000);
    },
    enableOfflineQueue: true // Required for BullMQ worker stability during temporary disconnects
});

redisConnection.on('connect', () => {
    console.log('BullMQ connected to Redis via ioredis successfully');
});

redisConnection.on('error', (err) => {
    console.error('BullMQ Redis Error:', err.message);
});

export default redisConnection;

