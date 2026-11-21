import { MongoClient } from 'mongodb';
import { env } from '../../config/env.js';

export const client = new MongoClient(`${env.DB_URI}`);

export const db = client.db('mentorlagbe');
export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log('You successfully connected to MongoDB!');
        return db;
    } catch (err) {
        console.dir(err);
        throw err;
    }
}
