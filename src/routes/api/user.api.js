import express from 'express';
import { userController } from '../../controller/user.controller.js';

const userRouter = express.Router();

userRouter.route('/all-users').get(userController.getAllUsers);

export { userRouter };
