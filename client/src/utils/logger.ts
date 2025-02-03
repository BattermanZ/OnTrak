// import { debounce } from 'lodash';

import { env, isDevelopment } from '../config/env';

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
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;

  private constructor() {
    this.BACKEND_URL = env.BACKEND_URL;
    
    // Log initialization in development
    if (isDevelopment) {
      console.log('Logger initialized with backend URL:', this.BACKEND_URL);
    }
    
    // Flush logs before page unload
    window.addEventListener('beforeunload', async (event) => {
      event.preventDefault();
      await this.flushLogs(true); // Force flush on unload
      return undefined;
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

  private async flushLogs(force: boolean = false) {
    if ((this.logBuffer.length === 0 || this.isErrored) && !force) return;

    // Filter out large data objects and format logs
    const logs = this.logBuffer.map(log => {
      let formattedData = '';
      if (log.data) {
        try {
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
        } catch (error) {
          formattedData = ' [Error serializing data]';
          console.error('Error serializing log data:', error);
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
        body: JSON.stringify({ logs, timestamp: new Date().toISOString() })
      });

      if (response.ok) {
        this.logBuffer = [];
        this.retryCount = 0; // Reset retry count on success
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to send logs to server:', error instanceof Error ? error.message : 'Unknown error');
      
      // Implement retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.flushLogs(), 1000 * Math.pow(2, this.retryCount)); // Exponential backoff
      } else {
        this.isErrored = true;
        if (this.errorTimeout) {
          clearTimeout(this.errorTimeout);
        }
        this.errorTimeout = window.setTimeout(() => {
          this.isErrored = false;
          this.retryCount = 0;
          this.errorTimeout = null;
        }, 30000) as unknown as number; // Reset after 30 seconds
      }
    }
  }

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = this.getTimestamp();
    
    // Filter out large data objects before logging
    let filteredData = undefined;
    if (data) {
      try {
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
      } catch (error) {
        console.error('Error processing log data:', error);
        filteredData = { error: 'Error processing log data' };
      }
    }
    
    // Create human-readable message
    const logMessage = `${timestamp} [${level.toUpperCase()}] ${message}${
      filteredData ? ' ' + JSON.stringify(filteredData, null, 2) : ''
    }`;
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(logMessage);
    }
    
    // Add to buffer
    this.logBuffer.push({ timestamp, level, message, data: filteredData });
    
    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushLogs();
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