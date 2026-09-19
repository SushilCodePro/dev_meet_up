import { createClient } from 'redis';

const client = createClient({
    username: process.env.REDIS_USER || 'default',
    password: process.env.REDIS_PASS || undefined,
    socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
        reconnectStrategy: (retries) => {
            if (retries > 3) {
                return false; // Stop retrying after 3 attempts in local dev
            }
            return 1000;
        }
    }
});

client.on('error', err => {
    // Suppress spammy log outputs when Redis is offline in local dev environment
});

(async () => {
    try {
        await client.connect();
        console.log('Redis connected successfully');
    } catch (err) {
        console.warn('Redis connection disabled or offline:', err.message);
    }
})();

export default client;
