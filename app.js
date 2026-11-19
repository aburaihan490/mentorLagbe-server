import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rootRouter } from './src/routes/index.js';
import { env } from './config/env.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // HTML form data handle করে
app.use(
    cors({
        origin: env.CLIENT_URL,
    }),
);

app.use('/api/v1', rootRouter);

export { app };
