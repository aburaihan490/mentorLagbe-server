import { MongoClient } from 'mongodb';
import { env } from '../../config/env.js';

const options = {
    maxPoolSize: 5,
    minPoolSize: 0,
    maxIdleTimeMS: 60000,
    serverSelectionTimeoutMS: 5000,
};

let client;
let clientPromise;

if (!globalThis._mongoClientPromise) {
    client = new MongoClient(env.DB_URI, options);

    globalThis._mongoClientPromise = client.connect();
}

clientPromise = globalThis._mongoClientPromise;

export const db = clientPromise.then((client) => client.db('mentorlagbe'));

export async function connectToMongoDB() {
    try {
        const connectedClient = await clientPromise;

        console.log('MongoDB connected successfully!');

        return connectedClient.db('mentorlagbe');
    } catch (error) {
        console.error('MongoDB connection error:', error);

        globalThis._mongoClientPromise = null;

        throw error;
    }
}
