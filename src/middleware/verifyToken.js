import { createRemoteJWKSet, jwtVerify } from 'jose';
// import { env } from '../../config/env.js';
import 'dotenv/config';

export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res
                .status(401)
                .json({ message: 'Unauthorized: Missing Bearer token' });
        }

        const token = authHeader.split(' ')[1]?.trim();
        if (!token || token === 'undefined' || token === 'null') {
            return res
                .status(401)
                .json({ message: 'Unauthorized: Invalid token value' });
        }

        const JWKS = createRemoteJWKSet(
            new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
        );

        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload; // req.user save the data payload
        next();
    } catch (error) {
        return res.status(401).json({
            message: `Unauthorized plz: ${error.message}`,
            error: error.message,
        });
    }
};
