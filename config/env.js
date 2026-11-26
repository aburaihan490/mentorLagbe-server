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
    CLIENT_URL: getEnv('CLIENT_URL'),
    STRIPE_SECRET_KEY: getEnv('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: getEnv('STRIPE_WEBHOOK_SECRET'),
};
