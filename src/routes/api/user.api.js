import express from 'express';

const userRouter = express.Router();

userRouter.route('/create-product').post((req, res) => {
    console.log(req.body);
});

export { userRouter };
