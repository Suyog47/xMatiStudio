import React from 'react'

const MaintenanceScreen: React.FC = () => {
  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
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
        src={'assets/studio/ui/public/img/xmati.png'}
        alt='xMati Logo'
        style={{ width: 150, height: 'auto', marginBottom: 24, userSelect: 'none' }}
        draggable={false}
      />
      <div
        style={{
          fontSize: 23,
          fontWeight: 600,
          color: '#102a43',
          width: '80%',
          maxWidth: 500,
          lineHeight: 1.6,
          wordSpacing: '2px',
        }}
      >
        The xMati platform is currently in Maintenance mode or maybe Server is out of reach.
        <br />
        Please check back later.
      </div>
    </div>
  )
}

export default MaintenanceScreen
