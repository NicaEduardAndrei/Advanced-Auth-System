import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      refreshToken?: string;
    }
  }
}

export {};