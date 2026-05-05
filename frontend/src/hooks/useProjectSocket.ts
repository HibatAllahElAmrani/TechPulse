import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:4000';

export interface MetricsUpdate {
  projectId: string;
  timestamp: string;
  metrics: {
    stars: number;
    forks: number;
    watchers: number;
    open_issues: number;
    open_prs: number;
  };
}

let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(WS_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return sharedSocket;
}

/**
 * Subscribe to real-time metric updates for a given project.
 */
export function useProjectSocket(
  projectId: string | null,
  onUpdate: (data: MetricsUpdate) => void
) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onUpdate);
  handlerRef.current = onUpdate;

  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMetricsUpdate = (data: MetricsUpdate) => handlerRef.current(data);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('metrics:update', onMetricsUpdate);

    socket.emit('subscribe:project', projectId);
    if (socket.connected) setConnected(true);

    return () => {
      socket.emit('unsubscribe:project', projectId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('metrics:update', onMetricsUpdate);
    };
  }, [projectId]);

  return { connected };
}
