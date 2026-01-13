import { useEffect, useState } from 'react'
import { initializeTabManager } from '../utils/TabManager'

/**
 * Custom hook to manage single-tab enforcement
 * Returns whether this tab is the active tab
 */
export const useTabManager = () => {
  const [activeTab, setActiveTab] = useState(false)

  // Initialize single-tab manager once on mount
  useEffect(() => {
    const manager = initializeTabManager()

    return () => {
      manager.destroy()
    }
  }, [])

  // Poll for active tab status
  useEffect(() => {
    const tabManager = initializeTabManager()

    // Check immediately
    const checkStatus = () => {
      setActiveTab(tabManager.isActiveTab())
    }

    // Initial check
    checkStatus()

    // Set up polling (fast, but not too aggressive)
    const interval = setInterval(checkStatus, 250) // 250ms is plenty

    return () => clearInterval(interval)
  }, [])

  return activeTab
}
