import winston from "winston";

const auditLogger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "audit.log" }),
    new winston.transports.Console()
  ]
});

export default auditLogger;
