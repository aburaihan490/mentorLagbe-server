import { app } from './app.js';
import { env } from './config/env.js';
import { connectToMongoDB } from './src/db/mongodb.js';

const port = env.PORT;

const connect = async () => {
    const connect = await connectToMongoDB();
    if (connect) {
        console.log('You successfully connected to MongoDB!');
    }
    app.listen(port, () => {
        console.log(`server running on http://localhost:${port}`);
    });
};

connect();
