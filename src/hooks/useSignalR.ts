import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

export const useSignalR = (hubPath: string, enabled = true) => {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    let isMounted = true;
    let reconnectTimeoutId: any = null;

    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5156'}${hubPath}`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => {
          const t = localStorage.getItem('token');
          return (t && t !== 'undefined') ? t : '';
        },
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .configureLogging({
        log(logLevel, message) {
          if (message.includes("Failed to start the HttpConnection before stop() was called")) {
            return;
          }
          if (logLevel >= signalR.LogLevel.Warning) {
            console.warn(`[SignalR] ${message}`);
          }
        }
      })
      .build();

    connectionRef.current = connection;

    const startConnection = async () => {
      if (!isMounted) return;
      try {
        if (connection.state === signalR.HubConnectionState.Disconnected) {
          await connection.start();
          if (isMounted) {
            setIsConnected(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Error connecting to SignalR Hub: ${hubPath}`, err);
          reconnectTimeoutId = setTimeout(startConnection, 5000);
        }
      }
    };

    startConnection();

    connection.onclose(() => {
      if (isMounted) {
        setIsConnected(false);
      }
    });

    connection.onreconnecting(() => {
      if (isMounted) {
        setIsConnected(false);
      }
    });

    connection.onreconnected(() => {
      if (isMounted) {
        setIsConnected(true);
      }
    });

    return () => {
      isMounted = false;
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
      
      const stopConnection = async () => {
        try {
          // If the connection is currently connected or connecting, stop it
          if (connection.state !== signalR.HubConnectionState.Disconnected) {
            await connection.stop();
          }
        } catch {
          // Suppress any abort warnings
        }
      };

      stopConnection();
      connectionRef.current = null;
    };
  }, [hubPath, enabled]);

  const on = useCallback((eventName: string, callback: (...args: any[]) => void) => {
    connectionRef.current?.on(eventName, callback);
  }, []);

  const off = useCallback((eventName: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      connectionRef.current?.off(eventName, callback);
    } else {
      connectionRef.current?.off(eventName);
    }
  }, []);

  const invoke = useCallback(async (methodName: string, ...args: any[]) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      return await connectionRef.current.invoke(methodName, ...args);
    }
    throw new Error('SignalR is not connected.');
  }, []);

  return {
    isConnected,
    on,
    off,
    invoke,
  };
};
