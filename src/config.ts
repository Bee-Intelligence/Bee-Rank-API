export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  databaseUrl: process.env.DB_URL,
  jwtSecret: process.env.JWT_SECRET || "your-jwt-secret",
  redisUrl: process.env.REDIS_URL,
};

export default config;
