import { Queue } from 'bullmq';
import redisConnection from '../config/bullmqRedis.js';

// Create a new Queue instance for handling emails
export const emailQueue = new Queue('emailQueue', {
    connection: redisConnection
});

console.log('emailQueue initialized');
