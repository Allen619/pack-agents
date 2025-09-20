// 结构化日志系统
// 支持服务端和客户端环境的同构日志系统

// 日志级别定义
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

// 日志类别定义
export enum LogCategory {
  APPLICATION = 'application',
  CLAUDE = 'claude',
  EXECUTION = 'execution',
  API = 'api',
  AGENT = 'agent',
  WORKFLOW = 'workflow',
  SYSTEM = 'system',
}

// 检查是否在服务端环境
const isServerSide = typeof window === 'undefined';

// 客户端简化版 logger
const createClientLogger = (category: LogCategory) => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const levels = ['error', 'warn', 'info', 'http', 'debug'];
  const logLevelIndex = levels.indexOf(logLevel);

  const shouldLog = (level: string) => {
    const levelIndex = levels.indexOf(level);
    return levelIndex <= logLevelIndex;
  };

  const formatMessage = (level: string, message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    let prefix = `[${timestamp}] ${level.toUpperCase()} [${category}]`;
    
    if (meta?.executionId) prefix += ` [exec:${meta.executionId.slice(-8)}]`;
    if (meta?.agentId) prefix += ` [agent:${meta.agentId.slice(-8)}]`;
    if (meta?.sessionId) prefix += ` [session:${meta.sessionId.slice(-8)}]`;
    
    const metaStr = meta && Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return { prefix, message, metaStr };
  };

  return {
    error: (message: string, meta?: any) => {
      if (shouldLog('error')) {
        const { prefix, metaStr } = formatMessage('error', message, meta);
        console.error(`${prefix}: ${message}${metaStr ? '\n' + metaStr : ''}`);
      }
    },
    warn: (message: string, meta?: any) => {
      if (shouldLog('warn')) {
        const { prefix, metaStr } = formatMessage('warn', message, meta);
        console.warn(`${prefix}: ${message}${metaStr ? '\n' + metaStr : ''}`);
      }
    },
    info: (message: string, meta?: any) => {
      if (shouldLog('info')) {
        const { prefix, metaStr } = formatMessage('info', message, meta);
        console.info(`${prefix}: ${message}${metaStr ? '\n' + metaStr : ''}`);
      }
    },
    http: (message: string, meta?: any) => {
      if (shouldLog('http')) {
        const { prefix, metaStr } = formatMessage('http', message, meta);
        console.log(`${prefix}: ${message}${metaStr ? '\n' + metaStr : ''}`);
      }
    },
    debug: (message: string, meta?: any) => {
      if (shouldLog('debug')) {
        const { prefix, metaStr } = formatMessage('debug', message, meta);
        console.debug(`${prefix}: ${message}${metaStr ? '\n' + metaStr : ''}`);
      }
    },
  };
};

// 服务端完整版 logger（延迟加载）
const createServerLogger = async (category: LogCategory) => {
  const winston = await import('winston');
  const path = await import('path');

  const logDir = './logs';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(
        ({ timestamp, level, message, category: cat, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? JSON.stringify(meta, null, 2)
            : '';
          return `[${timestamp}] ${level.toUpperCase()} [${cat || category}]: ${message}${metaStr ? '\n' + metaStr : ''}`;
        }
      )
    ),
    defaultMeta: {
      service: 'pack-agents',
      category,
      version: process.env.APP_VERSION || '1.0.0',
    },
    transports: [
      // 控制台输出
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            ({
              timestamp,
              level,
              message,
              category: cat,
              executionId,
              agentId,
              sessionId,
            }) => {
              let prefix = `[${timestamp}] ${level} [${cat || category}]`;
              if (executionId) prefix += ` [exec:${executionId.slice(-8)}]`;
              if (agentId) prefix += ` [agent:${agentId.slice(-8)}]`;
              if (sessionId) prefix += ` [session:${sessionId.slice(-8)}]`;
              return `${prefix}: ${message}`;
            }
          )
        ),
      }),

      // 错误日志文件
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),

      // 综合日志文件
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
      }),

      // 分类日志文件
      new winston.transports.File({
        filename: path.join(logDir, `${category}.log`),
        maxsize: 20 * 1024 * 1024, // 20MB
        maxFiles: 5,
      }),
    ],
  });
};

// 创建基础 logger
const createLogger = (category: LogCategory) => {
  if (!isServerSide) {
    // 客户端环境：使用简化版 console logger
    return createClientLogger(category);
  }
  
  // 服务端环境：返回 Promise，延迟加载 winston
  let serverLogger: any = null;
  
  const ensureServerLogger = async () => {
    if (!serverLogger) {
      serverLogger = await createServerLogger(category);
    }
    return serverLogger;
  };

  return {
    error: async (message: string, meta?: any) => {
      const logger = await ensureServerLogger();
      logger.error(message, meta);
    },
    warn: async (message: string, meta?: any) => {
      const logger = await ensureServerLogger();
      logger.warn(message, meta);
    },
    info: async (message: string, meta?: any) => {
      const logger = await ensureServerLogger();
      logger.info(message, meta);
    },
    http: async (message: string, meta?: any) => {
      const logger = await ensureServerLogger();
      logger.http(message, meta);
    },
    debug: async (message: string, meta?: any) => {
      const logger = await ensureServerLogger();
      logger.debug(message, meta);
    },
  };
};

// 创建分类 logger 实例
export const loggers = {
  application: createLogger(LogCategory.APPLICATION),
  claude: createLogger(LogCategory.CLAUDE),
  execution: createLogger(LogCategory.EXECUTION),
  api: createLogger(LogCategory.API),
  agent: createLogger(LogCategory.AGENT),
  workflow: createLogger(LogCategory.WORKFLOW),
  system: createLogger(LogCategory.SYSTEM),
};

// 默认 logger
export const logger = loggers.application;

// 专用 logger 函数
export const claudeLogger = {
  info: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.claude.info as any)(message, meta);
    } else {
      loggers.claude.info(message, meta);
    }
  },
  warn: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.claude.warn as any)(message, meta);
    } else {
      loggers.claude.warn(message, meta);
    }
  },
  error: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.claude.error as any)(message, meta);
    } else {
      loggers.claude.error(message, meta);
    }
  },
  debug: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.claude.debug as any)(message, meta);
    } else {
      loggers.claude.debug(message, meta);
    }
  },
};

export const executionLogger = {
  info: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.execution.info as any)(message, meta);
    } else {
      loggers.execution.info(message, meta);
    }
  },
  warn: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.execution.warn as any)(message, meta);
    } else {
      loggers.execution.warn(message, meta);
    }
  },
  error: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.execution.error as any)(message, meta);
    } else {
      loggers.execution.error(message, meta);
    }
  },
  debug: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.execution.debug as any)(message, meta);
    } else {
      loggers.execution.debug(message, meta);
    }
  },
};

export const apiLogger = {
  info: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.api.info as any)(message, meta);
    } else {
      loggers.api.info(message, meta);
    }
  },
  warn: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.api.warn as any)(message, meta);
    } else {
      loggers.api.warn(message, meta);
    }
  },
  error: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.api.error as any)(message, meta);
    } else {
      loggers.api.error(message, meta);
    }
  },
  debug: (message: string, meta?: any) => {
    if (isServerSide) {
      return (loggers.api.debug as any)(message, meta);
    } else {
      loggers.api.debug(message, meta);
    }
  },
};

// 创建执行追踪 logger
export function createExecutionLogger(executionId: string) {
  return {
    info: (message: string, meta?: any) => {
      const combinedMeta = { executionId, ...meta };
      if (isServerSide) {
        return (loggers.execution.info as any)(message, combinedMeta);
      } else {
        loggers.execution.info(message, combinedMeta);
      }
    },
    warn: (message: string, meta?: any) => {
      const combinedMeta = { executionId, ...meta };
      if (isServerSide) {
        return (loggers.execution.warn as any)(message, combinedMeta);
      } else {
        loggers.execution.warn(message, combinedMeta);
      }
    },
    error: (message: string, meta?: any) => {
      const combinedMeta = { executionId, ...meta };
      if (isServerSide) {
        return (loggers.execution.error as any)(message, combinedMeta);
      } else {
        loggers.execution.error(message, combinedMeta);
      }
    },
    debug: (message: string, meta?: any) => {
      const combinedMeta = { executionId, ...meta };
      if (isServerSide) {
        return (loggers.execution.debug as any)(message, combinedMeta);
      } else {
        loggers.execution.debug(message, combinedMeta);
      }
    },
  };
}

// 创建 Agent 追踪 logger
export function createAgentLogger(agentId: string, executionId?: string) {
  return {
    info: (message: string, meta?: any) => {
      const combinedMeta = { agentId, executionId, ...meta };
      if (isServerSide) {
        return (loggers.agent.info as any)(message, combinedMeta);
      } else {
        loggers.agent.info(message, combinedMeta);
      }
    },
    warn: (message: string, meta?: any) => {
      const combinedMeta = { agentId, executionId, ...meta };
      if (isServerSide) {
        return (loggers.agent.warn as any)(message, combinedMeta);
      } else {
        loggers.agent.warn(message, combinedMeta);
      }
    },
    error: (message: string, meta?: any) => {
      const combinedMeta = { agentId, executionId, ...meta };
      if (isServerSide) {
        return (loggers.agent.error as any)(message, combinedMeta);
      } else {
        loggers.agent.error(message, combinedMeta);
      }
    },
    debug: (message: string, meta?: any) => {
      const combinedMeta = { agentId, executionId, ...meta };
      if (isServerSide) {
        return (loggers.agent.debug as any)(message, combinedMeta);
      } else {
        loggers.agent.debug(message, combinedMeta);
      }
    },
  };
}

// 创建 Claude 会话追踪 logger
export function createClaudeSessionLogger(
  sessionId: string,
  executionId?: string
) {
  return {
    info: (message: string, meta?: any) => {
      const combinedMeta = { sessionId, executionId, ...meta };
      if (isServerSide) {
        return (loggers.claude.info as any)(message, combinedMeta);
      } else {
        loggers.claude.info(message, combinedMeta);
      }
    },
    warn: (message: string, meta?: any) => {
      const combinedMeta = { sessionId, executionId, ...meta };
      if (isServerSide) {
        return (loggers.claude.warn as any)(message, combinedMeta);
      } else {
        loggers.claude.warn(message, combinedMeta);
      }
    },
    error: (message: string, meta?: any) => {
      const combinedMeta = { sessionId, executionId, ...meta };
      if (isServerSide) {
        return (loggers.claude.error as any)(message, combinedMeta);
      } else {
        loggers.claude.error(message, combinedMeta);
      }
    },
    debug: (message: string, meta?: any) => {
      const combinedMeta = { sessionId, executionId, ...meta };
      if (isServerSide) {
        return (loggers.claude.debug as any)(message, combinedMeta);
      } else {
        loggers.claude.debug(message, combinedMeta);
      }
    },
  };
}

// 性能监控 logger
export function logPerformance(
  operation: string,
  duration: number,
  meta?: any
) {
  const logData = {
    operation,
    duration,
    unit: 'ms',
    ...meta,
  };
  
  if (isServerSide) {
    return (loggers.system.info as any)(`Performance: ${operation}`, logData);
  } else {
    loggers.system.info(`Performance: ${operation}`, logData);
  }
}

// API 请求日志
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  meta?: any
) {
  const logData = {
    method,
    path,
    statusCode,
    duration,
    unit: 'ms',
    ...meta,
  };
  
  if (isServerSide) {
    return (loggers.api.info as any)(`${method} ${path} ${statusCode}`, logData);
  } else {
    loggers.api.info(`${method} ${path} ${statusCode}`, logData);
  }
}

// 错误追踪
export function logError(error: Error, context?: string, meta?: any) {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    ...meta,
  };
  
  if (isServerSide) {
    return (logger.error as any)(`Error in ${context || 'unknown context'}: ${error.message}`, logData);
  } else {
    logger.error(`Error in ${context || 'unknown context'}: ${error.message}`, logData);
  }
}

// Claude API 调用日志
export function logClaudeApiCall(
  operation: 'analysis' | 'generation' | 'chat',
  sessionId: string,
  tokensUsed?: number,
  duration?: number,
  success: boolean = true,
  error?: string
) {
  const message = success
    ? `Claude ${operation} completed successfully`
    : `Claude ${operation} failed: ${error}`;

  const logLevel = success ? 'info' : 'error';
  const logData = {
    operation,
    sessionId,
    tokensUsed,
    duration,
    success,
    error,
  };

  if (isServerSide) {
    return (loggers.claude[logLevel] as any)(message, logData);
  } else {
    (loggers.claude as any)[logLevel](message, logData);
  }
}

// 初始化日志系统
export async function initializeLogging(): Promise<void> {
  // 只在服务端初始化文件日志系统
  if (!isServerSide) {
    console.info('Client-side logging initialized (console only)');
    return;
  }

  try {
    // 确保日志目录存在
    const fs = await import('fs/promises');
    await fs.mkdir('./logs', { recursive: true });

    // 使用同步调用，因为我们知道是服务端
    if (isServerSide) {
      await (logger.info as any)('Logging system initialized', {
        logLevel: process.env.LOG_LEVEL || 'info',
        environment: process.env.NODE_ENV || 'development',
      });
    }
  } catch (error) {
    console.error('Failed to initialize logging system:', error);
  }
}

// 清理旧日志
export async function cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
  // 只在服务端执行日志清理
  if (!isServerSide) {
    console.warn('Log cleanup is only available on server side');
    return;
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const logsDir = './logs';
    const files = await fs.readdir(logsDir);
    const now = Date.now();
    const cutoff = now - daysToKeep * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime.getTime() < cutoff) {
        await fs.unlink(filePath);
        if (isServerSide) {
          await (logger.info as any)(`Cleaned up old log file: ${file}`);
        }
      }
    }
  } catch (error) {
    if (isServerSide) {
      await (logger.error as any)('Failed to cleanup old logs', { error: (error as Error).message });
    } else {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}
