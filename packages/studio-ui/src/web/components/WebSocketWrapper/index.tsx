import axios from 'axios'
import { auth } from 'botpress/shared'
import { on } from 'events'
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { secureSessionStorage } from '../../utils/secureStorage'
import { useDevToolsProtection } from './hooks/useDevToolsProtection'
import { useTabManager } from './hooks/useTabManager'
import BlockedAccountScreen from './screens/BlockedAccountScreen'
import MaintenanceScreen from './screens/MaintenanceScreen'
import { debug } from './utils/debug'

interface WebSocketContextType {
  socket: WebSocket | null
  sendMessage: (message: string | object) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

interface WebSocketWrapperProps {
  url: string
  children: ReactNode
  reconnectInterval?: number
  reconnectAttempts?: number
  enabled?: boolean
  userId?: string
  enableDevToolsProtection?: boolean
  onMessage?: (event: MessageEvent) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

export const WebSocketWrapper: React.FC<WebSocketWrapperProps> = ({
  url,
  children,
  reconnectInterval = 3000,
  reconnectAttempts = 5,
  enabled = true,
  userId,
  enableDevToolsProtection = false,
  onConnect,
}) => {
  const [isConnected, setIsConnected] = useState(false)

  const [showBlockedScreen, setShowBlockedScreen] = useState(() => {
    const savedBlockedState = secureSessionStorage.getItem('accountBlocked')
    return savedBlockedState ? JSON.parse(savedBlockedState).isBlocked : false
  })

  const [showMaintenanceScreen, setShowMaintenanceScreen] = useState(() => {
    const savedMaintenanceState = secureSessionStorage.getItem('maintenance')
    return savedMaintenanceState ? JSON.parse(savedMaintenanceState).status : false
  })

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const isConnectingRef = useRef(false)
  const hasRegisteredRef = useRef(false)

  // Use tab manager to detect if this is the active tab
  const isActiveTab = useTabManager()

  // Enable DevTools protection if requested
  if (enableDevToolsProtection) {
    useDevToolsProtection()
  }

  // Centralized registration function
  const sendRegistration = (userIdToRegister: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN && userIdToRegister && !hasRegisteredRef.current) {
      const registrationMessage = {
        type: 'REGISTER_CHILD',
        userId: `${userIdToRegister}_studio`,
      }
      debug.log('[WebSocket] 📤 Sending REGISTER_CHILD:', registrationMessage)
      socketRef.current.send(JSON.stringify(registrationMessage))
      hasRegisteredRef.current = true
    }
  }

  const connect = () => {
    // Only connect if this is the active tab
    if (!isActiveTab) {
      debug.log('[WebSocket] Not the active tab, skipping connection')
      return
    }

    // Prevent multiple simultaneous connection attempts
    if (!enabled || isConnectingRef.current || socketRef.current?.readyState === WebSocket.OPEN) {
      if (!enabled) {
        debug.log('[WebSocket] Connection disabled via enabled prop')
      }
      if (isConnectingRef.current) {
        debug.log('[WebSocket] Already connecting, skipping duplicate attempt')
      }
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        debug.log('[WebSocket] Connection already open')
      }
      return
    }

    // Clean up any existing connection first
    if (socketRef.current) {
      debug.log('[WebSocket] Cleaning up existing connection before reconnect')
      socketRef.current.close()
      socketRef.current = null
    }

    isConnectingRef.current = true

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        // Unblock on successful connection
        onMaintenanceUpdate(false)

        debug.log('[WebSocket] ✅ Connection established successfully')
        setIsConnected(true)
        reconnectCountRef.current = 0
        isConnectingRef.current = false

        // Send REGISTER_CHILD message if userId is provided
        if (userId) {
          sendRegistration(userId)
        } else {
          debug.warn('[WebSocket] ⚠️  No userId provided yet, waiting for userId to become available')
        }

        onConnect?.()
      }

      // Logout handler - clears auth and redirects to admin
      const onLogout = () => {
        debug.log('[WebSocket] 🚪 Logging out user...')
        auth.logout(() => axios)
      }

      // Block status handler - shows blocked account screen
      const onBlockStatus = (status: string) => {
        setShowBlockedScreen(status === 'Blocked')
        secureSessionStorage.setItem('accountBlocked', JSON.stringify({
          isBlocked: status === 'Blocked',
        }))
      }

      // Maintenance update handler - shows maintenance screen
      const onMaintenanceUpdate = (status: boolean) => {
        setShowMaintenanceScreen(status)
        secureSessionStorage.setItem('maintenance', JSON.stringify({ status }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'REGISTER_SUCCESS':
            break
          case 'DUPLICATE_SESSION':
            alert('You or Someone else is already logged in from another tab or device. Please close the other session and try again.')
            onLogout()
            break
          case 'FORCE_LOGOUT':
            if (data.alert) {
              alert(data.message || 'You have been logged out by the server.')
            }
            onLogout()
            break
          case 'BLOCK_STATUS':
            onBlockStatus(data.message)
            break
          case 'MAINTENANCE_STATUS':
            onMaintenanceUpdate(data.message)
            break
          case 'error':
            alert(`WebSocket error: ${data.message || 'Unknown error'}`)
            onLogout()
            break
          default:
            alert(`[WebSocket] Unknown message type: ${data.type}`)
            onLogout()
            break
        }
      }

      ws.onerror = (error) => {
        isConnectingRef.current = false
        // On error, optimistically block the user with maintenance screen
        onMaintenanceUpdate(true)
      }

      let reconnectTimeout: NodeJS.Timeout | null = null
      ws.onclose = () => {
        debug.log('[WebSocket] 🔌 Connection closed')
        setIsConnected(false)
        isConnectingRef.current = false
        hasRegisteredRef.current = false // Reset registration status on disconnect

        // Attempt to reconnect
        reconnectTimeout = setTimeout(connect, 1000)
      }

      socketRef.current = ws
    } catch (error) {
      debug.error('[WebSocket] ❌ Exception during connection:', error)
      isConnectingRef.current = false
    }
  }

  useEffect(() => {
    debug.log('[WebSocket] Component mounted, initializing connection...')

    // Connect only once when component mounts (if enabled)
    if (enabled) {
      connect()
    }

    // Cleanup function - runs when component unmounts or dependencies change
    return () => {
      debug.log('[WebSocket] Component unmounting, cleaning up...')

      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        debug.log('[WebSocket] Clearing reconnection timeout')
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = undefined
      }

      // Close the WebSocket connection
      if (socketRef.current) {
        debug.log('[WebSocket] Closing WebSocket connection')
        socketRef.current.close()
        socketRef.current = null
      }

      // Reset connection state
      isConnectingRef.current = false
      reconnectCountRef.current = 0
      debug.log('[WebSocket] Cleanup complete')
    }
  }, [isActiveTab])

  // Monitor tab status and connect/disconnect accordingly
  useEffect(() => {
    debug.log('[WebSocket] Tab status changed. Is active tab:', isActiveTab)

    if (isActiveTab && enabled) {
      // This is now the active tab, connect if not already connected
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        debug.log('[WebSocket] Active tab detected, connecting...')
        connect()
      }
    } else if (!isActiveTab) {
      // This is not the active tab, disconnect if connected
      if (socketRef.current) {
        debug.log('[WebSocket] Inactive tab detected, disconnecting...')
        socketRef.current.close()
        socketRef.current = null
        setIsConnected(false)
        hasRegisteredRef.current = false
      }
    }
  }, [isActiveTab, enabled])

  const sendMessage = (message: string | object) => {
    if (socketRef.current && isConnected && socketRef.current.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message)
      socketRef.current.send(data)
    }
  }

  const contextValue: WebSocketContextType = {
    socket: socketRef.current,
    sendMessage,
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
      {showBlockedScreen && <BlockedAccountScreen />}
      {showMaintenanceScreen && <MaintenanceScreen />}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketWrapper')
  }
  return context
}
