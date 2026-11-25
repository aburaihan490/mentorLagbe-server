import express from 'express';
import { userRouter } from './api/user.api.js';
import tutionRouter from './api/tuitions.api.js';
import { aplicationRouter } from './api/application.api.js';
import tutorRouter from './api/tutor.api.js';
import paymentRouts from './api/payments.api.js';

const rootRouter = express.Router();

rootRouter.use('/auth', userRouter);
rootRouter.use('/tuition', tutionRouter);
rootRouter.use('/tutor', tutorRouter);
rootRouter.use('/applications', aplicationRouter);
rootRouter.use('/checkout', paymentRouts);

export { rootRouter };
