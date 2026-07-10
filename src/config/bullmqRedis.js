import Redis from 'ioredis';

// You can use your existing redis credentials or REDIS_URL here
// Replace this with your actual connection string if you have one.
const redisConnection = new Redis({
    host: 'redis-19303.c212.ap-south-1-1.ec2.cloud.redislabs.com',
    port: 19303,
    password: process.env.REDIS_PASS,
    username: 'default',
    maxRetriesPerRequest: null, // Critical: BullMQ requires this to be null
});

redisConnection.on('connect', () => {
    console.log('BullMQ connected to Redis via ioredis successfully');
});

redisConnection.on('error', (err) => {
    console.error('BullMQ Redis connection error:', err);
});

export default redisConnection;
