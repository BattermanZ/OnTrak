import { debounce } from 'lodash';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private logBuffer: LogEntry[] = [];
  private readonly bufferSize = 100;
  private readonly logFile = '../../logs/frontend.log';
  private queue: string[] = [];
  private isErrored: boolean = false;
  private errorTimeout: number | null = null;

  private constructor() {
    window.addEventListener('beforeunload', () => {
      this.flushLogs();
    });

    // Flush logs periodically
    setInterval(() => this.flushLogs(), 5000);
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getTimestamp(): string {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
  }

  private async flushLogs() {
    if (this.logBuffer.length === 0) return;

    const logs = this.logBuffer.map(log => 
      `${log.timestamp} [${log.level.toUpperCase()}] ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`
    ).join('\n') + '\n';

    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3456/api';
      const response = await fetch(`${baseUrl}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ logs })
      });

      if (response.ok) {
        this.logBuffer = [];
      }
    } catch (error) {
      console.error('Failed to write logs:', error);
    }
  }

  private debouncedFlushLogs = debounce(async () => {
    if (this.queue.length === 0 || this.isErrored) return;

    try {
      const logs = this.queue.join('\n');
      this.queue = [];
      
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      // Set error state and clear after timeout
      this.isErrored = true;
      if (this.errorTimeout) {
        clearTimeout(this.errorTimeout);
      }
      this.errorTimeout = window.setTimeout(() => {
        this.isErrored = false;
        this.errorTimeout = null;
      }, 5000) as unknown as number;

      // Don't log this error to prevent loops
      console.warn('Failed to send logs to server:', error);
    }
  }, 1000);

  private formatLogMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `${timestamp} [${level}] ${message}${dataStr}`;
  }

  public log(level: string, message: string, data?: any) {
    const logMessage = this.formatLogMessage(level, message, data);
    
    // Always log to console
    console.log(logMessage);
    
    // Only queue if not in error state
    if (!this.isErrored) {
      this.queue.push(logMessage);
      this.debouncedFlushLogs();
    }
  }

  public debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }

  public info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  public warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  public error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }
}

export const logger = Logger.getInstance(); 