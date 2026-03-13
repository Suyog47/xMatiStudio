import { Button, Intent } from '@blueprintjs/core'
import axios from 'axios'
import { NLU } from 'botpress/sdk'
import { lang, toast } from 'botpress/shared'
import { Dictionary } from 'lodash'
import React, { FC, useEffect, useReducer, useRef } from 'react'
import { connect } from 'react-redux'
import { RootReducer } from '~/reducers'
import EventBus from '~/util/EventBus'

interface Props {
  languages: string[]
}

interface TrainStatusEvent {
  botId: string
  type: 'nlu'
  trainSession: NLU.TrainingSession
}

const trainStatusReducer = (state, action) => {
  if (action.type === 'setAllTrainSessions') {
    return action.data
  } else if (action.type === 'setTrainSession') {
    const trainSession: NLU.TrainingSession = action.data.trainSession
    return { ...state, [trainSession.language]: trainSession }
  }
}

const makeErrorTrainSession = (language: string): NLU.TrainingSession => ({
  language,
  progress: 0,
  status: 'errored',
  key: 'no-key'
})

const isTrainStatusEvent = (event: any | TrainStatusEvent): event is TrainStatusEvent =>
  event.type === 'nlu' && event.trainSession

const TrainingStatusComponent: FC<Props> = (props: Props) => {
  const { languages } = props
  const [trainSessionsState, dispatch] = useReducer(trainStatusReducer, {})
  const prevErrorStatusRef = useRef<{ [lang: string]: boolean }>({})
  const prevTrainingStatusRef = useRef<{ [lang: string]: string }>({})

  const onStatusBarEvent = (event: any) => {
    if (isTrainStatusEvent(event) && event.botId === window.BOT_ID) {
      const trainSession = event.trainSession
      const previousStatus = prevTrainingStatusRef.current[trainSession.language]

      // Check if training just completed successfully
      if (
        trainSession.status === 'done' &&
        (previousStatus === 'training' || previousStatus === 'training-pending')
      ) {
        toast.success(
          `Training completed successfully for ${trainSession.language.toUpperCase()}`,
          'Training Complete',
          { timeout: 'medium' }
        )
      }

      // Check if this is a new error (status changed to 'errored')
      if (trainSession.status === 'errored' && !prevErrorStatusRef.current[trainSession.language]) {
        prevErrorStatusRef.current[trainSession.language] = true

        // Show error toast with language information
        const errorMessage = (event as any).trainSession?.error || 'Unknown error occurred during training'
        toast.failure(
          `Training failed for ${trainSession.language.toUpperCase()}: ${errorMessage}`,
          'Training Error',
          { timeout: 'long' }
        )
      } else if (trainSession.status !== 'errored') {
        // Reset error flag when status changes from errored
        prevErrorStatusRef.current[trainSession.language] = false
      }

      // Update the previous status tracker
      prevTrainingStatusRef.current[trainSession.language] = trainSession.status

      dispatch({ type: 'setTrainSession', data: { trainSession: event.trainSession } })
    }
  }

  const fetchTrainingSessionForLang = async (language: string): Promise<NLU.TrainingSession> => {
    try {
      return (await axios.get<NLU.TrainingSession>(`${window.BOT_API_PATH}/mod/nlu/training/${language}`)).data
    } catch (err) {
      return makeErrorTrainSession(language)
    }
  }

  useEffect(() => {
    EventBus.default.on('statusbar.event', onStatusBarEvent)
    return () => {
      EventBus.default.off('statusbar.event', onStatusBarEvent)
    }
  }, [])

  useEffect(() => {
    if (!languages) {
      return
    }

    Promise.map(languages, fetchTrainingSessionForLang)
      .then((sessions) => {
        const trainSessionBatchUpdate: Dictionary<NLU.TrainingSession> = {}
        sessions.forEach((session) => {
          trainSessionBatchUpdate[session.language] = session
        })
        dispatch({ type: 'setAllTrainSessions', data: trainSessionBatchUpdate })
      })
      .catch((err) => { }) // pretty much unreachable, error is handled in fetchTrainingSessionForLang
  }, [languages])

  const getTrainingStatus = () => {
    if (!languages || languages.length === 0) {
      return null
    }

    const sessions = languages.map(lang => trainSessionsState[lang]).filter(Boolean)
    if (sessions.length === 0) {
      return null
    }

    const hasTraining = sessions.some(session => session.status === 'training' || session.status === 'training-pending')
    const hasErrored = sessions.some(session => session.status === 'errored')
    const needsTraining = sessions.some(session => session.status === 'needs-training')

    // Priority: training/training-pending > needs-training > errored > done
    // This ensures we show active training progress even if some languages errored
    if (hasTraining) {
      return 'training'
    }
    if (needsTraining) {
      return 'needs-training'
    }
    if (hasErrored) {
      return 'errored'
    }
    return 'done'
  }

  const getTrainingProgress = () => {
    if (!languages) {
      return 0
    }

    const sessions = languages.map(lang => trainSessionsState[lang]).filter(Boolean)
    const trainingSessions = sessions.filter(session =>
      session.status === 'training' || session.status === 'training-pending'
    )

    if (trainingSessions.length === 0) {
      return 0
    }

    const totalProgress = trainingSessions.reduce((sum, session) => sum + (session.progress || 0), 0)
    return Math.round(totalProgress / trainingSessions.length)
  }

  const handleTrainClick = async () => {
    if (!languages) {
      return
    }

    try {
      for (const language of languages) {
        await axios.post(`${window.BOT_API_PATH}/mod/nlu/train/${language}`)
      }
      // Toast will be shown on successful completion via onStatusBarEvent
    } catch (err) {
      console.error('Training failed:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to start training'
      toast.failure(errorMessage, 'Training Error', { timeout: 'long' })
    }
  }

  const getButtonProps = () => {
    const status = getTrainingStatus()
    const progress = getTrainingProgress()

    const baseStyle = {
      padding: '12px 24px',
      fontSize: '13px',
      fontWeight: 'bold' as const,
      minWidth: '120px',
      height: '48px',
      borderRadius: '20px',
      border: 'none',
      transition: 'all 0.3s ease',
      position: 'relative' as const
    }

    switch (status) {
      case 'errored':
        return {
          text: 'Training Failed',
          intent: Intent.DANGER,
          onClick: handleTrainClick,
          style: {
            ...baseStyle,
            backgroundColor: '#dc3545',
            color: 'white',
            cursor: 'pointer',
            transform: 'scale(1)',
            boxShadow: '0 4px 8px rgba(220,53,69,0.3)'
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = '#c82333'
            e.target.style.transform = 'scale(1.05)'
            e.target.style.boxShadow = '0 6px 12px rgba(220,53,69,0.4)'
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = '#dc3545'
            e.target.style.transform = 'scale(1)'
            e.target.style.boxShadow = '0 4px 8px rgba(220,53,69,0.3)'
          }
        }
      case 'training':
        return {
          text: `Training... ${progress}%`,
          intent: Intent.WARNING,
          disabled: true,
          style: {
            ...baseStyle,
            backgroundColor: '#ffc107',
            color: 'white'
          }
        }
      case 'needs-training':
        return {
          text: lang.tr('statusBar.trainChatbot'),
          intent: Intent.PRIMARY,
          onClick: handleTrainClick,
          style: {
            ...baseStyle,
            backgroundColor: '#007bff',
            color: 'white',
            cursor: 'pointer',
            transform: 'scale(1)',
            boxShadow: '0 4px 8px rgba(0,123,255,0.3)'
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = '#0056b3'
            e.target.style.transform = 'scale(1.05)'
            e.target.style.boxShadow = '0 6px 12px rgba(0,123,255,0.4)'
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = '#007bff'
            e.target.style.transform = 'scale(1)'
            e.target.style.boxShadow = '0 4px 8px rgba(0,123,255,0.3)'
          }
        }
      case 'done':
        return {
          text: 'Training Complete',
          disabled: true,
          style: {
            ...baseStyle,
            backgroundColor: '#6c757d',
            color: 'white'
          }
        }
      default:
        return null
    }
  }

  const RippleEffect = ({ color = 'rgba(0, 123, 255, 0.2)' }: { color?: string }) => (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '150px',
      height: '150px',
      pointerEvents: 'none',
      zIndex: -1
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        backgroundColor: color,
        animation: 'ripple 2s infinite'
      }} />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        backgroundColor: color,
        animation: 'ripple 2s infinite 1s'
      }} />
      <style>
        {`
          @keyframes ripple {
            0% {
              transform: translate(-50%, -50%) scale(0.5);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.7);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  )

  //render
  if (!languages || languages.length < 1) {
    return null
  }

  const buttonProps = getButtonProps()
  if (!buttonProps) {
    return null
  }

  const status = getTrainingStatus()

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {status === 'needs-training' && <RippleEffect />}
      {status === 'errored' && <RippleEffect color="rgba(220, 53, 69, 0.2)" />}
      <Button
        large
        {...buttonProps}
      />
    </div>
  )
}

const mapStateToProps = (state: RootReducer) => ({
  languages: state.bot.languages
})

export default connect(mapStateToProps)(TrainingStatusComponent)
