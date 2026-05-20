import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useStore } from '@/store'
import toast from 'react-hot-toast'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002'

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const { addNotification, user, isAuthenticated } = useStore()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token')
      }
    })

    socket.on('connect', () => {
      console.log('Connected to notification server')
    })

    socket.on('notification', (notification) => {
      addNotification(notification)
      
      // Show toast for high priority notifications
      if (notification.type === 'error' || notification.type === 'warning') {
        toast(notification.title, {
          icon: notification.type === 'error' ? '❌' : '⚠️',
          duration: 5000
        })
      } else {
        toast.success(notification.title)
      }
    })

    socket.on('agent_update', (data) => {
      // Handle agent status updates in real-time
      // This could update the agent state in the store
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from notification server')
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [isAuthenticated, user, addNotification])

  return socketRef.current
}
