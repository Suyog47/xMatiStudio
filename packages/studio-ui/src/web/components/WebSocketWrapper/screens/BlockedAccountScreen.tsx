import React from 'react'

interface BlockedAccountScreenProps { }

const BlockedAccountScreen: React.FC<BlockedAccountScreenProps> = () => {
  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f8f0ff 0%, #e0b3ff 100%)',
        textAlign: 'center',
        padding: 24,
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
      }}
    >
      <img
        src="assets/studio/ui/public/img/xmati.png"
        alt='xMati Logo'
        style={{ width: 150, height: 'auto', marginBottom: 32, userSelect: 'none' }}
        draggable={false}
      />
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#7c3aed',
          marginBottom: 16,
        }}
      >
        🚫 Account Blocked
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          color: '#2d3748',
          width: '80%',
          maxWidth: 600,
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        Your account has been temporarily blocked due to security or policy violations.
      </div>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
          fontSize: 16,
          color: '#4a5568',
          maxWidth: 500,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          Please contact support for assistance or wait for the block to be lifted.
        </div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>
          If you believe this is an error, please reach out to our support team.
        </div>
      </div>
    </div>
  )
}

export default BlockedAccountScreen
