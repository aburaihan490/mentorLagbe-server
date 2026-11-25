import express from 'express';
import cors from 'cors';
import { rootRouter } from './src/routes/index.js';
import { env } from './config/env.js';
import { paymentsController } from './src/controller/payments.controller.js';

const app = express();

app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    paymentsController.stripeWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: env.CLIENT_URL,
    }),
);

app.use('/api/v1', rootRouter);

export { app };
