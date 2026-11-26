import express from 'express';
import { paymentsController } from '../../controller/payments.controller.js';
import { verifyToken } from '../../middleware/verifyToken.js';
import { verifyAdmin } from '../../middleware/verifyAdmin.js';

const paymentRouts = express.Router();

paymentRouts
    .route('/create-checkout-session')
    .post(verifyToken, paymentsController.checkOutPayment);

paymentRouts
    .route('/get-student-payments')
    .get(verifyToken, paymentsController.getStudentPayments);

paymentRouts
    .route('/admin/transactions')
    .get(verifyToken, verifyAdmin, paymentsController.getAllTransactions);

export default paymentRouts;
