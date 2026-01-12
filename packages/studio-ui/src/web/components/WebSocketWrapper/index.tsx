import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useDevToolsProtection } from './hooks/useDevToolsProtection'
import { debug } from './utils/debug'

interface WebSocketContextType {
  socket: WebSocket | null
  isConnected: boolean
  sendMessage: (message: string | object) => void
  lastMessage: MessageEvent | null
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
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
  onMessage,
  onConnect,
  onDisconnect,
  onError
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
    'disconnected'
  )
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const isConnectingRef = useRef(false)
  const hasRegisteredRef = useRef(false)

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
    debug.log('[WebSocket] Attempting to connect to:', url)

    try {
      setConnectionStatus('connecting')
      const ws = new WebSocket(url)

      ws.onopen = () => {
        debug.log('[WebSocket] ✅ Connection established successfully')
        setIsConnected(true)
        setConnectionStatus('connected')
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

      ws.onmessage = (event) => {
        debug.log('[WebSocket] 📨 Message received:', event.data)
        setLastMessage(event)
        onMessage?.(event)
      }

      ws.onerror = (error) => {
        debug.error('[WebSocket] ❌ Error occurred:', error)
        setConnectionStatus('error')
        isConnectingRef.current = false
        onError?.(error)
      }

      ws.onclose = () => {
        debug.log('[WebSocket] 🔌 Connection closed')
        setIsConnected(false)
        setConnectionStatus('disconnected')
        isConnectingRef.current = false
        hasRegisteredRef.current = false // Reset registration status on disconnect
        onDisconnect?.()

        // Attempt to reconnect
        if (enabled && reconnectCountRef.current < reconnectAttempts) {
          debug.log(
            `[WebSocket] 🔄 Scheduling reconnection attempt ${reconnectCountRef.current + 1}/${reconnectAttempts} in ${reconnectInterval}ms`
          )
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current += 1
            connect()
          }, reconnectInterval)
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          debug.warn('[WebSocket] ⛔ Max reconnection attempts reached. Giving up.')
        }
      }

      socketRef.current = ws
    } catch (error) {
      debug.error('[WebSocket] ❌ Exception during connection:', error)
      setConnectionStatus('error')
      isConnectingRef.current = false
    }
  }

  useEffect(() => {
    debug.log('[WebSocket] Component mounted, initializing connection...')
    debug.log('[WebSocket] Configuration:', {
      url,
      enabled,
      userId,
      reconnectAttempts,
      reconnectInterval,
      enableDevToolsProtection
    })

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
  }, []) // Empty dependency array - only run once on mount

  // Watch for userId changes and send registration when available
  // useEffect(() => {
  //   if (userId && isConnected && !hasRegisteredRef.current) {
  //     debug.log('[WebSocket] 👤 userId became available:', userId)
  //     sendRegistration(userId)
  //   }
  // }, [userId, isConnected])

  const sendMessage = (message: string | object) => {
    if (socketRef.current && isConnected && socketRef.current.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message)
      socketRef.current.send(data)
    }
  }

  const contextValue: WebSocketContextType = {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    lastMessage,
    connectionStatus
  }

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>
}

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketWrapper')
  }
  return context
}
