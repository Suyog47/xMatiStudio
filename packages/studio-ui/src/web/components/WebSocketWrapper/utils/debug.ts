/**
 * Debug utility for WebSocket wrapper
 * Set DEBUG_WEBSOCKET=true in window or localStorage to enable logging
 */

const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  // Check window global
  if ((window as any).DEBUG_WEBSOCKET === true) {
    return true
  }

  // Check localStorage
  try {
    return localStorage.getItem('DEBUG_WEBSOCKET') === 'true'
  } catch {
    return false
  }
}

export const debug = {
  log: (...args: any[]) => {
    if (isDebugEnabled()) {
      // tslint:disable-next-line:no-console
      console.log(...args)
    }
  },

  warn: (...args: any[]) => {
    if (isDebugEnabled()) {
      // tslint:disable-next-line:no-console
      console.warn(...args)
    }
  },

  error: (...args: any[]) => {
    if (isDebugEnabled()) {
      // tslint:disable-next-line:no-console
      console.error(...args)
    }
  },

  info: (...args: any[]) => {
    if (isDebugEnabled()) {
      // tslint:disable-next-line:no-console
      console.info(...args)
    }
  }
}

// Always log errors in development
if (process.env.NODE_ENV === 'development') {
  // tslint:disable-next-line:no-console
  console.log('[WebSocket Debug] To enable WebSocket debugging, run: localStorage.setItem("DEBUG_WEBSOCKET", "true")')
}
