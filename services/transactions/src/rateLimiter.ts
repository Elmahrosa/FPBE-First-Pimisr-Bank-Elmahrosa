import rateLimit from "express-rate-limit";

export const transferLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: {
    error: "Too many transfer attempts, please try again later."
  }
});
