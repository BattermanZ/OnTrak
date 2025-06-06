import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !socketRef.current) {
      logger.info('Initializing socket connection');
      
      socketRef.current = io(env.BACKEND_URL, {
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