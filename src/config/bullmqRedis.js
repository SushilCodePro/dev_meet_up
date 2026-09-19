import Redis from 'ioredis';

const redisConnection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASS || undefined,
    username: process.env.REDIS_USER || 'default',
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy: (times) => {
        if (times > 3) {
            return null; // Stop retrying after 3 attempts
        }
        return 1000;
    },
    enableOfflineQueue: false
});

redisConnection.on('connect', () => {
    console.log('BullMQ connected to Redis via ioredis successfully');
});

redisConnection.on('error', (err) => {
    // Graceful error logging
});

export default redisConnection;
