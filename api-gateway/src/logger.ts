import winston from 'winston';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${message}${extra}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format:
    process.env.NODE_ENV === 'production'
      ? combine(timestamp(), json())
      : combine(timestamp({ format: 'HH:mm:ss' }), colorize(), devFormat),
  transports: [new winston.transports.Console()],
});

export default logger;
