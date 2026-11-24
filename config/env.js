import 'dotenv/config';

function getEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing env variable: ${name}`);
    }

    return value;
}

export const env = {
    PORT: getEnv('PORT'),
    DB_URI: getEnv('MONGODB_URL'),
    // Frontend origin allowed by CORS.
    CLIENT_URL: getEnv('CLIENT_URL' || 'http://localhost:8000'),
    STRIPE_SECRET_KEY: getEnv('STRIPE_SECRET_KEY'),
    STRIPE_TUTOR_PRICE_ID: getEnv('STRIPE_TUTOR_PRICE_ID'),
    STRIPE_STUDENT_PRICE_ID: getEnv('STRIPE_STUDENT_PRICE_ID'),
};
