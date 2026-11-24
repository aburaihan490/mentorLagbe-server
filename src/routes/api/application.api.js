import express from 'express';
import { verifyToken } from '../../middleware/verifyToken.js';
import { applicationController } from '../../controller/application.controller.js';
import { verifyStudent } from '../../middleware/verifyStudent.js';
import { verifyTutor } from '../../middleware/verifyTutor.js';

const aplicationRouter = express.Router();

// 1. Create Application (only student Apply)
aplicationRouter
    .route('/student-application')
    .post(verifyToken, verifyStudent, applicationController.createApplication);

// Get My APplications (student)
aplicationRouter
    .route('/get-student-application')
    .get(verifyToken, verifyStudent, applicationController.getMyApplications);

// Get My APplications (tutor)
aplicationRouter
    .route('/get-application')
    .get(verifyToken, verifyTutor, applicationController.getTutorApplications);

//  Update Application Status (Tutor)
aplicationRouter
    .route('/update-application/:id')
    .patch(
        verifyToken,
        verifyTutor,
        applicationController.updateApplicationStatus,
    );

//  Delete Application (Student)
aplicationRouter
    .route('/delete-application/:id')
    .delete(
        verifyToken,
        verifyStudent,
        applicationController.deleteApplication,
    );

export { aplicationRouter };
