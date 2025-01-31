// import { debounce } from 'lodash';

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
  private isErrored: boolean = false;
  private errorTimeout: number | null = null;
  private readonly BACKEND_URL: string;

  private constructor() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const backendUrl = process.env.BACKEND_URL || (isDevelopment ? 'http://localhost:3456' : undefined);
    
    if (!backendUrl) {
      throw new Error('BACKEND_URL environment variable is not set in production mode');
    }
    this.BACKEND_URL = backendUrl;
    
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
    if (this.logBuffer.length === 0 || this.isErrored) return;

    // Filter out large data objects and format logs
    const logs = this.logBuffer.map(log => {
      let formattedData = '';
      if (log.data) {
        // Create a copy of data to modify
        const dataCopy = { ...log.data };
        
        // Remove large response data
        if (dataCopy.response) delete dataCopy.response;
        if (dataCopy.adherence) delete dataCopy.adherence;
        if (dataCopy.statistics) delete dataCopy.statistics;
        
        // Only include data if it's not empty
        if (Object.keys(dataCopy).length > 0) {
          formattedData = ' ' + JSON.stringify(dataCopy);
        }
      }
      return `${log.timestamp} [${log.level.toUpperCase()}] ${log.message}${formattedData}`;
    }).join('\n') + '\n';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.BACKEND_URL}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ logs })
      });

      if (response.ok) {
        this.logBuffer = [];
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      this.isErrored = true;
      if (this.errorTimeout) {
        clearTimeout(this.errorTimeout);
      }
      this.errorTimeout = window.setTimeout(() => {
        this.isErrored = false;
        this.errorTimeout = null;
      }, 5000) as unknown as number;

      console.warn('Failed to send logs to server:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = this.getTimestamp();
    
    // Filter out large data objects before logging
    let filteredData = undefined;
    if (data) {
      // Create a copy of data to modify
      const dataCopy = { ...data };
      
      // Remove large response data
      if (dataCopy.response) delete dataCopy.response;
      if (dataCopy.adherence) delete dataCopy.adherence;
      if (dataCopy.statistics) delete dataCopy.statistics;
      
      // Only include data if it's not empty
      if (Object.keys(dataCopy).length > 0) {
        filteredData = dataCopy;
      }
    }
    
    // Create human-readable message
    const logMessage = `${timestamp} [${level.toUpperCase()}] ${message}${
      filteredData ? ' ' + JSON.stringify(filteredData) : ''
    }`;
    console.log(logMessage);
    
    // Add to buffer
    this.logBuffer.push({ timestamp, level, message, data: filteredData });
    
    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushLogs();
    }
  }

  public debug(message: string, data?: any) {
    // Use debug only for detailed technical information
    this.log('debug', message, data);
  }

  public info(message: string, data?: any) {
    // Use info for general application flow and user actions
    this.log('info', message, data);
  }

  public warn(message: string, data?: any) {
    // Use warn for concerning but non-critical issues
    this.log('warn', message, data);
  }

  public error(message: string, data?: any) {
    // Use error for critical issues that affect functionality
    this.log('error', message, data);
  }
}

export const logger = Logger.getInstance(); 