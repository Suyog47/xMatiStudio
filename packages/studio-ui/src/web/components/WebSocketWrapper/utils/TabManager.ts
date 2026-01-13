/**
 * TabManager - Enforces single-tab rule for the application
 *
 * When a user tries to open the app in multiple tabs, this manager will:
 * 1. Detect if another tab is already open
 * 2. Focus the existing tab (if possible)
 * 3. Display a message and close the new tab
 *
 * Uses BroadcastChannel API with localStorage fallback for older browsers
 */

const TAB_ID_KEY = 'xmati_active_tab_id'
const TAB_CHANNEL = 'xmati_tab_channel'
const HEARTBEAT_INTERVAL = 2000 // 2 seconds
const TAB_TIMEOUT = 5000 // 5 seconds
const PING_TIMEOUT = 1000 // Wait 1 second for responses

export class TabManager {
  private tabId: string
  private channel: BroadcastChannel | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isActive: boolean = false
  private useLocalStorage: boolean = false
  private receivedPong: boolean = false
  private pingResponses: Set<string> = new Set()

  constructor() {
    this.tabId = this.generateTabId()
    this.initialize()
  }

  public isActiveTab(): boolean {
    return this.isActive
  }

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initialize(): void {
    // Try to use BroadcastChannel API
    if (typeof BroadcastChannel !== 'undefined') {
      this.initializeBroadcastChannel()
    } else {
      // Fallback to localStorage for older browsers
      this.useLocalStorage = true
      this.initializeLocalStorage()
    }

    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    // Handle beforeunload to clean up
    window.addEventListener('beforeunload', this.cleanup)
  }

  private initializeBroadcastChannel(): void {
    try {
      this.channel = new BroadcastChannel(TAB_CHANNEL)

      // Listen for messages from other tabs
      this.channel.onmessage = (event) => {
        const { type, tabId, timestamp } = event.data

        switch (type) {
          case 'ping':
            // Someone is checking if we exist
            if (this.isActive || (timestamp && parseInt(this.tabId.split('_')[1]) < timestamp)) {
              // We're older (or active), respond with pong
              this.channel?.postMessage({
                type: 'pong',
                tabId: this.tabId,
                timestamp: Date.now()
              })
            }
            break

          case 'pong':
            // Another tab responded - it exists!
            if (tabId !== this.tabId) {
              this.receivedPong = true
              this.pingResponses.add(tabId)

              if (!this.isActive) {
                this.handleDuplicateTab()
              }
            }
            break

          case 'heartbeat':
            // Another tab is sending heartbeat (it's active)
            if (tabId !== this.tabId && !this.isActive) {
              this.handleDuplicateTab()
            }
            break

          case 'focus_request':
            // Someone wants us to focus
            if (this.isActive) {
              window.focus()
            }
            break

          case 'claim':
            // Another tab is claiming to be the active one
            if (tabId !== this.tabId && timestamp &&
              parseInt(this.tabId.split('_')[1]) > timestamp) {
              // They're older, we should yield
              this.handleDuplicateTab()
            }
            break
        }
      }

      // Send ping to check for existing tabs
      this.channel.postMessage({
        type: 'ping',
        tabId: this.tabId,
        timestamp: parseInt(this.tabId.split('_')[1])
      })

      // Announce our existence and check age
      this.channel.postMessage({
        type: 'claim',
        tabId: this.tabId,
        timestamp: parseInt(this.tabId.split('_')[1])
      })

      // Wait for responses, then decide
      setTimeout(() => {
        if (!this.receivedPong && this.pingResponses.size === 0) {
          // No other tab responded, we're the first!
          this.activateTab()
        } else if (this.receivedPong) {
          // Another tab exists and responded
          if (!this.isActive) {
            this.handleDuplicateTab()
          }
        }
      }, PING_TIMEOUT)

    } catch (error) {
      console.error('BroadcastChannel failed:', error)
      this.useLocalStorage = true
      this.initializeLocalStorage()
    }
  }

  private initializeLocalStorage(): void {
    // Check if another tab is active
    const existingTabData = localStorage.getItem(TAB_ID_KEY)

    if (existingTabData) {
      try {
        const { tabId, timestamp } = JSON.parse(existingTabData)
        const timeSinceLastHeartbeat = Date.now() - timestamp

        // If the last heartbeat is recent, another tab is active
        if (timeSinceLastHeartbeat < TAB_TIMEOUT) {
          // Double check by waiting a bit
          setTimeout(() => {
            const currentData = localStorage.getItem(TAB_ID_KEY)
            if (currentData) {
              const { tabId: currentTabId, timestamp: currentTimestamp } = JSON.parse(currentData)
              if (Date.now() - currentTimestamp < TAB_TIMEOUT && currentTabId !== this.tabId) {
                this.handleDuplicateTab()
                return
              }
            }
            // If we get here, activate
            this.activateTab()
          }, 300)
          return
        }
      } catch (error) {
        console.error('Error parsing tab data:', error)
      }
    }

    // No active tab found, activate this one
    this.activateTab()

    // Listen for storage events from other tabs
    window.addEventListener('storage', this.handleStorageEvent)
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key === TAB_ID_KEY) {
      if (event.newValue) {
        try {
          const { tabId, timestamp } = JSON.parse(event.newValue)
          if (tabId !== this.tabId && this.isActive) {
            // Another tab is updating heartbeat
            const timeSince = Date.now() - timestamp
            if (timeSince < TAB_TIMEOUT) {
              // They're active too - conflict!
              this.handleDuplicateTab()
            }
          }
        } catch (error) {
          console.error('Error handling storage event:', error)
        }
      }
    }
  }


  private activateTab(): void {
    this.isActive = true

    // Store this tab as the active one
    this.updateHeartbeat()

    // Announce activation
    if (this.channel) {
      this.channel.postMessage({
        type: 'activated',
        tabId: this.tabId,
        timestamp: Date.now()
      })
    }

    // Start heartbeat to keep this tab marked as active
    this.heartbeatInterval = setInterval(() => {
      this.updateHeartbeat()
    }, HEARTBEAT_INTERVAL)
  }

  private updateHeartbeat(): void {
    if (this.useLocalStorage) {
      const tabData = {
        tabId: this.tabId,
        timestamp: Date.now()
      }
      localStorage.setItem(TAB_ID_KEY, JSON.stringify(tabData))
    } else if (this.channel && this.isActive) {
      // Also broadcast heartbeat
      this.channel.postMessage({
        type: 'heartbeat',
        tabId: this.tabId,
        timestamp: Date.now()
      })
    }
  }

  private handleDuplicateTab(): void {
    if (this.isActive) {
      return
    } // Don't handle if already active

    // Try to focus the existing tab
    this.requestFocusOnExistingTab()

    // Show message to user (same as your code, but optimized)
    this.showDuplicateTabMessage()

    // Close this tab after a short delay
    setTimeout(() => {
      this.attemptCloseTab()
    }, 2000)
  }

  private showDuplicateTabMessage(): void {
    // Clear existing content safely (avoid innerHTML)
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild)
    }

    // Create container div
    const container = document.createElement('div')
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 20px;
    `

    // Create message box
    const messageBox = document.createElement('div')
    messageBox.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    `

    // Create SVG icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '80')
    svg.setAttribute('height', '80')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2')
    svg.style.marginBottom = '20px'

    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path1.setAttribute('d', 'M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4m4-16h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4')

    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    path2.setAttribute('points', '13 7 9 12 13 17')

    svg.appendChild(path1)
    svg.appendChild(path2)

    // Create title
    const title = document.createElement('h1')
    title.textContent = 'Application Already Open'
    title.style.cssText = 'font-size: 28px; margin: 0 0 16px 0; font-weight: 600;'

    // Create message paragraph
    const message = document.createElement('p')
    message.textContent = 'xMati is already running in another tab. Please switch to the existing tab to continue using the application.'
    message.style.cssText = 'font-size: 16px; margin: 0 0 24px 0; opacity: 0.9; line-height: 1.5;'

    // Create footer paragraph
    const footer = document.createElement('p')
    footer.textContent = "This window will close automatically... and if it doesn't, you can close it manually."
    footer.style.cssText = 'font-size: 14px; margin: 0; opacity: 0.7;'

    // Assemble the DOM
    messageBox.appendChild(svg)
    messageBox.appendChild(title)
    messageBox.appendChild(message)
    messageBox.appendChild(footer)
    container.appendChild(messageBox)
    document.body.appendChild(container)
  }

  private attemptCloseTab(): void {
    window.close()
  }

  private requestFocusOnExistingTab(): void {
    if (this.channel) {
      this.channel.postMessage({ type: 'focus_request' })
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Tab is hidden
    } else {
      // Tab is visible again - update heartbeat
      if (this.isActive) {
        this.updateHeartbeat()
      }
    }
  }

  private cleanup = (): void => {

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Close broadcast channel
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }

    // Cleanup localStorage if we were the active tab
    if (this.isActive && this.useLocalStorage) {
      try {
        const currentData = localStorage.getItem(TAB_ID_KEY)
        if (currentData) {
          const { tabId } = JSON.parse(currentData)
          if (tabId === this.tabId) {
            localStorage.removeItem(TAB_ID_KEY)
          }
        }
      } catch (error) {
        console.error('Cleanup error:', error)
      }
    }

    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('storage', this.handleStorageEvent)
  }

  public destroy(): void {
    this.cleanup()
  }
}

// Singleton instance
let tabManagerInstance: TabManager | null = null

export const initializeTabManager = (): TabManager => {
  if (!tabManagerInstance) {
    tabManagerInstance = new TabManager()
  }
  return tabManagerInstance
}

export const getTabManager = (): TabManager | null => {
  return tabManagerInstance
}
