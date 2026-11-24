import express from 'express';
import { paymentsController } from '../../controller/payments.controller.js';

const paymentRouts = express.Router();

paymentRouts
    .route('/create-checkout-session')
    .post(paymentsController.checkOutPayment);

export default paymentRouts;
