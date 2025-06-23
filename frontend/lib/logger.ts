// A custom logger implementation that avoids using log4js
// This prevents the dynamic import issues with Next.js

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LoggerOptions {
  useColors?: boolean;
  logToFile?: boolean;
  logFilePath?: string;
}

const LOG_COLORS = {
  debug: "\x1b[34m", // Blue
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
  fatal: "\x1b[35m", // Magenta
  reset: "\x1b[0m", // Reset
};

class Logger {
  private category: string;
  private options: LoggerOptions;

  constructor(category: string, options: LoggerOptions = {}) {
    this.category = category;
    this.options = {
      useColors: true,
      logToFile: false,
      logFilePath: "./app.log",
      ...options,
    };
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.category}]`;

    if (this.options.useColors && typeof window === "undefined") {
      return `${LOG_COLORS[level]}${prefix} ${message}${LOG_COLORS.reset}`;
    }

    return `${prefix} ${message}`;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    const formattedMessage = this.formatMessage(level, message);

    switch (level) {
      case "debug":
        console.debug(formattedMessage, ...args);
        break;
      case "info":
        console.info(formattedMessage, ...args);
        break;
      case "warn":
        console.warn(formattedMessage, ...args);
        break;
      case "error":
      case "fatal":
        console.error(formattedMessage, ...args);
        break;
    }

    // In a real implementation, this would write to a file if logToFile is true
    // However, for browser compatibility and Next.js simplicity, we skip this part
  }

  debug(message: string, ...args: any[]) {
    this.log("debug", message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log("info", message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log("warn", message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log("error", message, ...args);
  }

  fatal(message: string, ...args: any[]) {
    this.log("fatal", message, ...args);
  }
}

// Create a singleton cache of loggers
const loggers: Record<string, Logger> = {};

export function getLogger(category: string, options?: LoggerOptions): Logger {
  if (!loggers[category]) {
    loggers[category] = new Logger(category, options);
  }
  return loggers[category];
}

// For compatibility with existing code that might use log4js
export const configure = () => {
  console.warn(
    "log4js.configure() called, but using custom logger implementation"
  );
  return { getLogger };
};

export default { getLogger, configure };
