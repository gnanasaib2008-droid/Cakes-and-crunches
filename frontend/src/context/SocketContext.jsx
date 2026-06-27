import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { showToast } = useAuth();

  useEffect(() => {
    // Establish connection to backend
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      withCredentials: true,
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to WebSockets KDS server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSockets KDS server');
      setConnected(false);
    });

    newSocket.on('order_created', (data) => {
      console.log('📬 Live socket event: order_created', data);
      
      // Notify using premium Toast
      if (data.risk_level === 'critical') {
        showToast(`🚨 CRITICAL SAFETY ALERT: New order #${data.id} placed by ${data.customer_name} requires override approval!`, 'danger');
      } else {
        showToast(`🍰 Live KDS Update: New order #${data.id} placed by ${data.customer_name}!`, 'info');
      }
    });

    newSocket.on('order_updated', (data) => {
      console.log('📬 Live socket event: order_updated', data);
      if (data.action === 'approved') {
        showToast(`🔓 Order #${data.id} has been approved for baking by Admin.`, 'success');
      } else if (data.action === 'status_changed') {
        showToast(`📋 Order #${data.id} status updated to: ${data.status.toUpperCase()}`, 'info');
      } else if (data.action === 'modified') {
        showToast(`✏️ Order #${data.id} details have been updated by staff.`, 'info');
      }
    });

    newSocket.on('order_deleted', (data) => {
      console.log('📬 Live socket event: order_deleted', data);
      showToast(`🗑️ Order #${data.id} has been removed from KDS.`, 'warning');
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
