import { MongoClient } from 'mongodb';
import { env } from '../../config/env.js';

const client = new MongoClient(`${env.DB_URI}/`);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log('You successfully connected to MongoDB!');
        return client;
    } catch (err) {
        console.dir(err);
    }
}

// Call this only when your application terminates
// export async function disconnectFromMongoDB() {
//     await client.close();
// }
