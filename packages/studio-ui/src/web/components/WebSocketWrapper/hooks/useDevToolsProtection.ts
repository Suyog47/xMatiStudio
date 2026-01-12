import { useEffect } from 'react'

// Debug utility for DevTools protection
const debugDevTools = {
  log: (...args: any[]) => {
    if (typeof window !== 'undefined' && (window as any).DEBUG_DEVTOOLS === true) {
      // tslint:disable-next-line:no-console
      console.log('[DevTools Protection]', ...args)
    }
  }
}

/**
 * Custom hook to protect against DevTools usage
 * - Disables right-click context menu
 * - Disables common DevTools keyboard shortcuts
 * - Detects when DevTools is open and shows warning overlay
 *
 * To enable debugging: window.DEBUG_DEVTOOLS = true
 */
export const useDevToolsProtection = () => {
  useEffect(() => {
    debugDevTools.log('Initializing DevTools protection...')

    const disableRightClick = (e: MouseEvent) => {
      debugDevTools.log('Right-click blocked')
      e.preventDefault()
    }

    // Disable common keyboard shortcuts for DevTools
    const disableDevToolsShortcuts = (e: KeyboardEvent) => {
      // F12
      if (e.keyCode === 123) {
        debugDevTools.log('F12 blocked')
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+I or Cmd+Opt+I (Inspect Element)
      if ((e.ctrlKey && e.shiftKey && e.keyCode === 73) || (e.metaKey && e.altKey && e.keyCode === 73)) {
        debugDevTools.log('Ctrl+Shift+I / Cmd+Opt+I blocked')
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+J or Cmd+Opt+J (Console)
      if ((e.ctrlKey && e.shiftKey && e.keyCode === 74) || (e.metaKey && e.altKey && e.keyCode === 74)) {
        debugDevTools.log('Ctrl+Shift+J / Cmd+Opt+J blocked')
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+C or Cmd+Opt+C (Inspect Element)
      if ((e.ctrlKey && e.shiftKey && e.keyCode === 67) || (e.metaKey && e.altKey && e.keyCode === 67)) {
        debugDevTools.log('Ctrl+Shift+C / Cmd+Opt+C blocked')
        e.preventDefault()
        return false
      }
      // Ctrl+U or Cmd+U (View Source)
      if ((e.ctrlKey && e.keyCode === 85) || (e.metaKey && e.keyCode === 85)) {
        debugDevTools.log('Ctrl+U / Cmd+U blocked')
        e.preventDefault()
        return false
      }
    }

    // Detect if DevTools is open by checking window size differences
    const detectDevTools = () => {
      const threshold = 160
      const widthThreshold = window.outerWidth - window.innerWidth > threshold
      const heightThreshold = window.outerHeight - window.innerHeight > threshold

      if (widthThreshold || heightThreshold) {
        debugDevTools.log('DevTools detected! Width/Height threshold exceeded')
        // DevTools detected - take aggressive action
        const overlay = document.getElementById('devtools-warning')
        if (!overlay) {
          debugDevTools.log('Creating warning overlay and blur wrapper')
          // Create blur wrapper for content
          const contentWrapper = document.createElement('div')
          contentWrapper.id = 'devtools-blur-wrapper'
          contentWrapper.style.cssText = `
            filter: blur(10px);
            pointer-events: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 999998;
          `

          // Move all body children into wrapper
          while (document.body.firstChild) {
            contentWrapper.appendChild(document.body.firstChild)
          }
          document.body.appendChild(contentWrapper)

          // Create clear warning overlay on top
          const warningDiv = document.createElement('div')
          warningDiv.id = 'devtools-warning'
          warningDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            flex-direction: column;
          `
          warningDiv.innerHTML = `
            <div>⚠️ Developer Tools Detected</div>
            <div style="font-size: 16px; margin-top: 20px;">Please close Developer Tools and refresh the page to continue</div>
          `
          document.body.appendChild(warningDiv)
          debugDevTools.log('Warning overlay created and displayed')
        }
      } else {
        // DevTools closed - restore normal view
        const blurWrapper = document.getElementById('devtools-blur-wrapper')
        if (blurWrapper) {
          debugDevTools.log('DevTools closed, removing warning overlay and blur')
          // Move children back to body
          while (blurWrapper.firstChild) {
            document.body.appendChild(blurWrapper.firstChild)
          }
          blurWrapper.remove()
        }

        const overlay = document.getElementById('devtools-warning')
        if (overlay) {
          overlay.remove()
          debugDevTools.log('Warning overlay removed')
        }
      }
    }

    // Disable right-click anywhere on the page
    debugDevTools.log('Registering right-click blocker')
    window.addEventListener('contextmenu', disableRightClick)

    // Disable keyboard shortcuts
    debugDevTools.log('Registering keyboard shortcut blockers')
    window.addEventListener('keydown', disableDevToolsShortcuts)

    // Check for DevTools periodically - ENABLED for active protection
    debugDevTools.log('Starting DevTools detection interval (1000ms)')
    const devToolsInterval = setInterval(detectDevTools, 1000)

    debugDevTools.log('DevTools protection fully initialized')

    return () => {
      debugDevTools.log('Cleaning up DevTools protection...')
      window.removeEventListener('contextmenu', disableRightClick)
      window.removeEventListener('keydown', disableDevToolsShortcuts)
      clearInterval(devToolsInterval)
      debugDevTools.log('DevTools protection cleanup complete')
    }
  }, [])
}
