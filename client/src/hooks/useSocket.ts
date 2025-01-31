import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { logger } from '../utils/logger';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !socketRef.current) {
      logger.info('Initializing socket connection');
      
      const isDevelopment = process.env.NODE_ENV === 'development';
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (isDevelopment ? 'http://localhost:3456' : undefined);
      
      if (!BACKEND_URL) {
        logger.error('REACT_APP_BACKEND_URL environment variable is not set in production mode');
        return;
      }
      
      socketRef.current = io(BACKEND_URL, {
        auth: {
          token,
        },
      });

      socketRef.current.on('connect', () => {
        logger.info('Socket connected successfully');
      });

      socketRef.current.on('connect_error', (error) => {
        logger.error('Socket connection failed', {
          message: error.message
        });
      });

      socketRef.current.on('disconnect', (reason) => {
        logger.warn('Socket disconnected', { reason });
      });
    }

    return () => {
      if (socketRef.current) {
        logger.info('Closing socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef.current;
};

export default useSocket; 