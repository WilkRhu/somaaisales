import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = 'https://somaaibackend.onrender.com';

export type DriverLocation = {
  latitude: number;
  longitude: number;
  driverId: string;
  timestamp: string;
};

export type OrderStatusUpdate = {
  orderId: string;
  status: string;
  description?: string;
  timestamp: string;
};

export function useDeliverySocket(orderId: string | null, token: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<OrderStatusUpdate | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!orderId || !token) return;

    const socket = io(`${BACKEND_URL}/delivery`, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe:order', { orderId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('driver:location', (data: DriverLocation) => {
      setDriverLocation({
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        driverId: data.driverId,
        timestamp: data.timestamp,
      });
    });

    socket.on('status:update', (data: OrderStatusUpdate) => {
      setStatusUpdate({
        orderId: data.orderId,
        status: data.status,
        description: data.description,
        timestamp: data.timestamp,
      });
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Erro de conexão:', err.message);
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [orderId, token]);

  return { driverLocation, statusUpdate, connected };
}
