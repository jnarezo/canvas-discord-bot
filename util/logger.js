const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

winston.configure({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.splat(),
        winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`),
        // winston.format.simple(),
      ),
    }),
    new DailyRotateFile({
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.splat(),
        winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`),
        // winston.format.simple(),
      ),
    }),
    // new winston.transports.File({
    //     filename: 'combined-%DATE%.log',
    //     datePattern: 'YYYY-MM-DD',
    //     format: winston.format.combine(
    //         winston.format.timestamp(),
    //         winston.format.splat(),
    //         winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`),
    //         // winston.format.simple(),
    //     ),
    // }),
  ]
});