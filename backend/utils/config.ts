import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  resendApiKey: required("RESEND_API_KEY"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtPendingSecret: required("JWT_PENDING_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  totpSecret: required("TOTP_SECRET"),
  domain: required("DOMAIN"),
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? "development",
};