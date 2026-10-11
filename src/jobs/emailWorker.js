import { Worker } from 'bullmq';
import redisConnection from '../config/bullmqRedis.js';

// The Worker executes the jobs in the queue
// Because this runs on Render Free tier, we keep concurrency at 1
// and run it in the same process to save memory.
export const emailWorker = new Worker('emailQueue', async job => {
    console.log(`Processing job ${job.id} of type ${job.name}...`);

    // Extract data from the job payload
    const {
        senderName,
        recipientEmail,
        recipientName,
    } = job.data;

    if (job.name === "connectionRequest") {
        console.log(`Pretending to send welcome email to ${recipientName} (${recipientEmail})...`);
        // Add your actual email sending logic here (e.g. Resend, SendGrid, Nodemailer)
        await new Promise(resolve => setTimeout(resolve, 9000)); // Simulate async task
        console.log(`Successfully sent welcome email to ${recipientEmail}`);
    }

}, {
    connection: redisConnection,
    concurrency: 1 // Crucial for low-CPU environments
});

emailWorker.on('completed', job => {
    console.log(`${job.id} has completed!`);
});

emailWorker.on('failed', (job, err) => {
    console.log(`${job.id} has failed with ${err.message}`);
});

// When you write new Worker('emailQueue', async job => { ... }) and pass an inline function directly into it like we did, BullMQ runs that code in the exact same main process and exact same Event Loop as your Express API.
// Why does it run in the same process?
// BullMQ is designed this way because spinning up a child process takes extra memory (RAM) and extra CPU time. Since sending an email is just an I/O task (as we discussed), it doesn't need its own dedicated CPU core. It runs perfectly fine alongside your API in the main Event Loop.