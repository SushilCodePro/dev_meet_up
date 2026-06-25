import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'redis-19303.c212.ap-south-1-1.ec2.cloud.redislabs.com',
        port: 19303
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();
// await client.set('foo', 'bar');
// const result = await client.get('foo');
// console.log(result)  // >>> bar

export default client;

