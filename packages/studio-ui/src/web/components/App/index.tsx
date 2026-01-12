import axios from 'axios'
import { TokenRefresher } from 'botpress/shared'
import React, { Component, Fragment } from 'react'
import { connect } from 'react-redux'
import {
  fetchBotInformation,
  fetchModules,
  fetchSkills,
  fetchUser,
  getModuleTranslations,
  handleReceiveFlowsModification,
  refreshHints
} from '~/actions'
import { authEvents, setToken } from '~/util/Auth'
import EventBus from '~/util/EventBus'
import { secureLocalStorage } from '~/utils/secureStorage'

import Routes, { history } from '../Routes'
import { WebSocketWrapper } from '../WebSocketWrapper'

interface Props {
  fetchModules: () => void
  fetchSkills: () => void
  refreshHints: () => void
  fetchBotInformation: () => void
  getModuleTranslations: () => void
  fetchUser: () => void
  handleReceiveFlowsModification: (modifications: any) => void
  user: any
  bot: any
}

class App extends Component<Props> {
  /**
   * Get user email from encrypted localStorage formData
   * This is used as a fallback when Redux user state is not yet available
   */
  private getUserEmailFromStorage() {
    const userData = secureLocalStorage.getItem('userData')
    let parsedUserData: any = null
    try {
      parsedUserData = userData ? JSON.parse(userData) : null
    } catch (e) {
      parsedUserData = null
    }
    return parsedUserData?.email || null
  }

  fetchData = () => {
    this.props.getModuleTranslations()
    this.props.fetchBotInformation()
    this.props.fetchModules()
    this.props.fetchSkills()
    this.props.fetchUser()
    if (window.IS_BOT_MOUNTED) {
      this.props.refreshHints()
    }
  }

  // Prevents re-rendering the whole layout when the user changes. Fixes a bunch of warnings & double queries
  shouldComponentUpdate() {
    return false
  }

  componentDidMount() {
    const appName = window.APP_NAME || 'xMati Studio'
    const botName = window.BOT_NAME ? ` – ${window.BOT_NAME}` : ''
    window.document.title = `${appName}${botName}`

    if (window.APP_FAVICON) {
      const link = document.querySelector('link[rel="icon"]')
      link.setAttribute('href', window.APP_FAVICON)
    }

    if (window.APP_CUSTOM_CSS) {
      const sheet = document.createElement('link')
      sheet.rel = 'stylesheet'
      sheet.href = window.APP_CUSTOM_CSS
      sheet.type = 'text/css'
      document.head.appendChild(sheet)
    }

    EventBus.default.setup()

    // This acts as the app lifecycle management.
    // If this grows too much, move to a dedicated lifecycle manager.
    this.fetchData()

    authEvents.on('login', this.fetchData)
    authEvents.on('new_token', this.fetchData)

    EventBus.default.on('flow.changes', (payload) => {
      // TODO: should check if real uniq Id is different. Multiple browser windows can be using the same email. There should be a uniq window Id.
      const isOtherUser = this.props.user.email !== payload.userEmail
      const isSameBot = payload.botId === window.BOT_ID
      if (isOtherUser && isSameBot) {
        this.props.handleReceiveFlowsModification(payload)
      }
    })

    EventBus.default.on('hints.updated', () => {
      this.props.refreshHints()
    })

    window.addEventListener('message', (e) => {
      if (!e.data || !e.data.action) {
        return
      }

      const { action, payload } = e.data
      if (action === 'navigate-url') {
        history.push(payload)
      }
    })
  }

  render() {
    // WebSocket URL - configured via environment variable
    const WEBSOCKET_URL = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8000'

    // Get userId with fallback priority:
    // 1. Redux user state (logged in user)
    // 2. Encrypted localStorage formData (saved email)
    // 3. Bot owner from config
    const userIdFromStorage = this.getUserEmailFromStorage()
    const userId = userIdFromStorage

    return (
      <Fragment>
        {!window.IS_STANDALONE && (
          <TokenRefresher getAxiosClient={() => axios} onRefreshCompleted={(token) => setToken(token)} />
        )}
        <WebSocketWrapper
          url={WEBSOCKET_URL}
          enabled={true}
          userId={userId}
          enableDevToolsProtection={true}
          reconnectAttempts={5}
          reconnectInterval={3000}
          onConnect={() => {
            // WebSocket connected to xMati Studio
          }}
          onDisconnect={() => {
            // WebSocket disconnected from xMati Studio
          }}
          onError={(error) => {
            // Handle WebSocket errors
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.data)
              // Handle WebSocket messages here
              // You can dispatch Redux actions or handle events based on message type
            } catch (error) {
              // Handle non-JSON messages
            }
          }}
        >
          <Routes />
        </WebSocketWrapper>
      </Fragment>
    )
  }
}

const mapDispatchToProps = {
  fetchUser,
  fetchBotInformation,
  fetchModules,
  fetchSkills,
  refreshHints,
  handleReceiveFlowsModification,
  getModuleTranslations
}

const mapStateToProps = (state) => ({
  user: state.user,
  bot: state.bot
})

export default connect(mapStateToProps, mapDispatchToProps)(App)
