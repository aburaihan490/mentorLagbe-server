import express from 'express';
import { userRouter } from './api/user.api.js';
import tutionRouter from './api/tuitions.api.js';

const rootRouter = express.Router();

rootRouter.use('/auth', userRouter);
rootRouter.use('/tuition', tutionRouter);

export { rootRouter };
