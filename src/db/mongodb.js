import { MongoClient } from 'mongodb';
import { env } from '../../config/env.js';

if (!env.DB_URI) {
    throw new Error('DB_URI is missing in environment variables');
}

const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
};

const globalForMongo = globalThis;

if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(env.DB_URI, options);
}

export const client = globalForMongo._mongoClient;
export const db = client.db('mentorlagbe');

let connectionPromise = null;

export async function connectToMongoDB() {
    try {
        // topology closed ba disconnected hole fresh promise banano
        if (!connectionPromise) {
            connectionPromise = client.connect().catch((err) => {
                connectionPromise = null;
                throw err;
            });
        }

        await connectionPromise;

        // Ping check: connection alive ache kina verify kora
        await db.command({ ping: 1 });
        return db;
    } catch (err) {
        connectionPromise = null;
        console.error('MongoDB connection error:', err);
        throw err;
    }
}
