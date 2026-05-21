const path = require("path");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const requiredVariables = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "MAILJET_API_KEY",
  "MAILJET_SECRET_KEY",
];

const missing = requiredVariables.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.warn(
    `Warning: missing required environment variables: ${missing.join(", ")}`
  );
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  cors: {
    origins: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
      : ["*"],
  },
  db: process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL_CA
        ? {
          rejectUnauthorized: true,
          ca: require('fs').readFileSync(process.env.DB_SSL_CA).toString(),
        }
        : (process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined),
    },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
    verifySecret: process.env.JWT_VERIFY_SECRET || process.env.JWT_SECRET,
    verifyExpiresIn: process.env.JWT_VERIFY_EXPIRES_IN || "24h",
    refreshSecret: process.env.JWT_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "24h",
    bcryptSaltRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  },
  mailjet: {
    apiKey: process.env.MAILJET_API_KEY,
    secretKey: process.env.MAILJET_SECRET_KEY,
  },
};

module.exports = config;
