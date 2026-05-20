// src/lib/socket.ts
// Socket.io client singleton — import this in any component that needs real-time events.

import { io } from 'socket.io-client'

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3002'

export const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
  transports: ['websocket', 'polling'],
})

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id)
})

socket.on('disconnect', (reason) => {
  console.warn('[Socket] Disconnected:', reason)
})

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err.message)
})

export default socket
