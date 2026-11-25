import express from 'express';
import { paymentsController } from '../../controller/payments.controller.js';
import { verifyToken } from '../../middleware/verifyToken.js';

const paymentRouts = express.Router();

paymentRouts
    .route('/create-checkout-session')
    .post(verifyToken, paymentsController.checkOutPayment);

export default paymentRouts;
