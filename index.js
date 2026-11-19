import { app } from './app.js';
import { env } from './config/env.js';
import { connectToMongoDB } from './src/db/mongodb.js';

const port = env.PORT;

const connect = async () => {
    await connectToMongoDB();
    app.listen(port, () => {
        console.log(`server running on http://localhost:${port}`);
    });
};

connect();
