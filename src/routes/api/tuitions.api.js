import express from 'express';
import { tutionController } from '../../controller/tuition.controller.js';

const tutionRouter = express.Router();

tutionRouter.route('/all-tuitions').get(tutionController.getAllTuitions);
tutionRouter.route('/single-tuition/:id').get(tutionController.singleTuition);

export default tutionRouter;
