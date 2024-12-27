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

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level,
      message,
      data
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushLogs();
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const logMessage = `${entry.timestamp} [${level.toUpperCase()}] ${message}`;
      switch (level) {
        case 'debug':
          console.log(logMessage, data || '');
          break;
        case 'info':
          console.info(logMessage, data || '');
          break;
        case 'warn':
          console.warn(logMessage, data || '');
          break;
        case 'error':
          console.error(logMessage, data || '');
          break;
      }
    }
  }

  public debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  public info(message: string, data?: any) {
    this.log('info', message, data);
  }

  public warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  public error(message: string, data?: any) {
    this.log('error', message, data);
  }
}

export const logger = Logger.getInstance(); 