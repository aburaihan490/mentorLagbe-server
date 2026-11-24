import express from 'express';
import { verifyTutor } from '../../middleware/verifyTutor.js';
import { verifyToken } from '../../middleware/verifyToken.js';
import { tutorController } from '../../controller/tutor.controller.js';

const tutorRouter = express.Router();

tutorRouter
    .route('/create-tuition')
    .post(verifyToken, verifyTutor, tutorController.createTuitions);
// Get tutor dashboard tuitions
tutorRouter.get(
    '/tutor-all-tutions',
    verifyToken,
    verifyTutor,
    tutorController.getTutorTuitions,
);
// tution information update
tutorRouter.patch(
    '/update-tuitions/:id',
    verifyToken,
    verifyTutor,
    tutorController.updateTuitions,
);

// isAcitve true false
tutorRouter.patch(
    '/toggle-tuition/:id',
    verifyToken,
    verifyTutor,
    tutorController.toggleTuition,
);

tutorRouter.delete(
    '/delete-tuition/:id',
    verifyToken,
    verifyTutor,
    tutorController.deleteTuition,
);

export default tutorRouter;
