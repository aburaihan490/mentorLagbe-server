import express from 'express';
import { tutionController } from '../../controller/tuition.controller.js';

const tutionRouter = express.Router();

tutionRouter.route('/create-tuition').post(tutionController.createTuitions);

export default tutionRouter;
