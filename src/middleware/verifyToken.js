import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../../config/env.js';

export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];

        const JWKS = createRemoteJWKSet(
            new URL(`${env.CLIENT_URL}/api/auth/jwks`),
        );

        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload; // req.user save the data payload
        next();
    } catch (error) {
        return res.status(401).json({
            message: `'Unauthorized, Internal Server Error'${error.message}`,
            error: error.message,
        });
    }
};
