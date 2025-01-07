import { useState, useCallback } from 'react';
import type { TemplateHistoryAction } from '../types';

const MAX_HISTORY = 50;

export const useTemplateHistory = () => {
  const [history, setHistory] = useState<TemplateHistoryAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const addAction = useCallback((action: Omit<TemplateHistoryAction, 'timestamp'>) => {
    const newAction: TemplateHistoryAction = {
      ...action,
      timestamp: Date.now()
    };

    setHistory(prev => {
      // Remove all actions after current index
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new action
      newHistory.push(newAction);
      
      // Keep only last MAX_HISTORY actions
      if (newHistory.length > MAX_HISTORY) {
        return newHistory.slice(newHistory.length - MAX_HISTORY);
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex >= 0) {
      const action = history[currentIndex];
      setCurrentIndex(prev => prev - 1);
      return action;
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const action = history[currentIndex + 1];
      setCurrentIndex(prev => prev + 1);
      return action;
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    addAction,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    currentIndex
  };
}; 