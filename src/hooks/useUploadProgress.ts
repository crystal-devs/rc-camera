// hooks/useUploadProgress.ts - Frontend upload progress tracking

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSimpleWebSocket } from '@/hooks/useWebSocket';

interface FileProgress {
  fileId: string;
  filename: string;
  status: 'queued' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: 'upload' | 'validation' | 'processing' | 'thumbnail' | 'variants' | 'completed' | 'failed';
  uploadSpeed?: number;
  eta?: number;
  error?: string;
  urls?: {
    preview?: string;
    thumbnail?: string;
    display?: string;
    full?: string;
  };
}

interface SessionProgress {
  total: number;
  uploaded: number;
  processing: number;
  completed: number;
  failed: number;
  percentage: number;
}

interface UploadSession {
  sessionId: string;
  eventId: string;
  userId: string;
  userType: 'admin' | 'guest';
  progress: SessionProgress;
  files: FileProgress[];
  isActive: boolean;
  isComplete: boolean;
  startTime: Date;
  endTime?: Date;
}

interface UploadProgressHookReturn {
  sessions: Map<string, UploadSession>;
  currentSession: UploadSession | null;
  isUploading: boolean;
  isProcessing: boolean;
  createSession: (sessionId: string, files: Array<{ fileId: string; filename: string; size: number }>) => void;
  getSessionProgress: (sessionId: string) => SessionProgress | null;
  getFileProgress: (sessionId: string, fileId: string) => FileProgress | null;
  clearCompletedSessions: () => void;
}

export function useUploadProgress(
  eventId: string,
  userType: 'admin' | 'guest' = 'admin'
): UploadProgressHookReturn {
  const [sessions, setSessions] = useState<Map<string, UploadSession>>(new Map());
  const [currentSession, setCurrentSession] = useState<UploadSession | null>(null);
  
  const webSocket = useSimpleWebSocket(eventId, undefined, userType);
  const mountedRef = useRef(true);

  // Handle upload progress updates
  const handleUploadProgress = useCallback((payload: any) => {
    if (!mountedRef.current) return;

    console.log('📈 Upload progress update:', payload);

    setSessions(prev => {
      const newSessions = new Map(prev);
      
      const session: UploadSession = {
        sessionId: payload.sessionId,
        eventId: payload.eventId,
        userId: payload.userId,
        userType: payload.userType,
        progress: payload.progress,
        files: payload.files,
        isActive: true,
        isComplete: false,
        startTime: new Date(),
        endTime: undefined
      };

      newSessions.set(payload.sessionId, session);
      
      // Update current session if this is the latest one
      if (!currentSession || payload.sessionId === currentSession.sessionId) {
        setCurrentSession(session);
      }

      return newSessions;
    });
  }, [currentSession]);

  // Handle individual file progress updates
  const handleFileProgressUpdate = useCallback((payload: any) => {
    if (!mountedRef.current) return;

    console.log('📁 File progress update:', payload);

    setSessions(prev => {
      const newSessions = new Map(prev);
      const session = newSessions.get(payload.sessionId);
      
      if (session) {
        const updatedFiles = session.files.map(file => 
          file.fileId === payload.file.fileId 
            ? { ...file, ...payload.file }
            : file
        );
        
        const updatedSession = {
          ...session,
          files: updatedFiles
        };
        
        newSessions.set(payload.sessionId, updatedSession);
        
        // Update current session if needed
        if (currentSession?.sessionId === payload.sessionId) {
          setCurrentSession(updatedSession);
        }
      }

      return newSessions;
    });
  }, [currentSession]);

  // Handle session completion
  const handleSessionComplete = useCallback((payload: any) => {
    if (!mountedRef.current) return;

    console.log('🏁 Upload session complete:', payload);

    setSessions(prev => {
      const newSessions = new Map(prev);
      const session = newSessions.get(payload.sessionId);
      
      if (session) {
        const completedSession = {
          ...session,
          isActive: false,
          isComplete: true,
          endTime: new Date()
        };
        
        newSessions.set(payload.sessionId, completedSession);
        
        // Clear current session if this was it
        if (currentSession?.sessionId === payload.sessionId) {
          setCurrentSession(null);
        }
      }

      return newSessions;
    });

    // Show completion notification
    const { summary } = payload;
    if (summary.completedFiles > 0) {
      console.log(`✅ Upload completed: ${summary.completedFiles}/${summary.totalFiles} files processed`);
    }
  }, [currentSession]);

  // Set up WebSocket listeners
  useEffect(() => {
    if (!webSocket.socket || !webSocket.isAuthenticated) return;

    webSocket.socket.on('upload_progress', handleUploadProgress);
    webSocket.socket.on('file_progress_update', handleFileProgressUpdate);
    webSocket.socket.on('upload_session_complete', handleSessionComplete);

    return () => {
      webSocket.socket?.off('upload_progress', handleUploadProgress);
      webSocket.socket?.off('file_progress_update', handleFileProgressUpdate);
      webSocket.socket?.off('upload_session_complete', handleSessionComplete);
    };
  }, [webSocket.socket, webSocket.isAuthenticated, handleUploadProgress, handleFileProgressUpdate, handleSessionComplete]);

  // Create a new upload session
  const createSession = useCallback((
    sessionId: string, 
    files: Array<{ fileId: string; filename: string; size: number }>
  ) => {
    const session: UploadSession = {
      sessionId,
      eventId,
      userId: webSocket.user?.id || 'unknown',
      userType,
      progress: {
        total: files.length,
        uploaded: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        percentage: 0
      },
      files: files.map(file => ({
        fileId: file.fileId,
        filename: file.filename,
        status: 'queued',
        progress: 0,
        stage: 'upload'
      })),
      isActive: true,
      isComplete: false,
      startTime: new Date()
    };

    setSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.set(sessionId, session);
      return newSessions;
    });

    setCurrentSession(session);
  }, [eventId, userType, webSocket.user]);

  // Get session progress
  const getSessionProgress = useCallback((sessionId: string): SessionProgress | null => {
    const session = sessions.get(sessionId);
    return session ? session.progress : null;
  }, [sessions]);

  // Get file progress
  const getFileProgress = useCallback((sessionId: string, fileId: string): FileProgress | null => {
    const session = sessions.get(sessionId);
    if (!session) return null;
    
    return session.files.find(file => file.fileId === fileId) || null;
  }, [sessions]);

  // Clear completed sessions
  const clearCompletedSessions = useCallback(() => {
    setSessions(prev => {
      const newSessions = new Map();
      for (const [sessionId, session] of prev.entries()) {
        if (session.isActive && !session.isComplete) {
          newSessions.set(sessionId, session);
        }
      }
      return newSessions;
    });
  }, []);

  // Compute derived state
  const isUploading = currentSession?.isActive && currentSession.progress.uploaded < currentSession.progress.total;
  const isProcessing = currentSession?.isActive && currentSession.progress.processing > 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    sessions,
    currentSession,
    isUploading,
    isProcessing,
    createSession,
    getSessionProgress,
    getFileProgress,
    clearCompletedSessions
  };
}

// Simplified hook for just current upload status
export function useCurrentUploadProgress(eventId: string, userType: 'admin' | 'guest' = 'admin') {
  const { currentSession, isUploading, isProcessing } = useUploadProgress(eventId, userType);
  
  return {
    session: currentSession,
    isUploading,
    isProcessing,
    progress: currentSession?.progress || null,
    files: currentSession?.files || []
  };
}