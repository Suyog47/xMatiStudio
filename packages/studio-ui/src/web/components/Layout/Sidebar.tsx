import { Classes, Dialog, Icon, Position, Tooltip } from '@blueprintjs/core'
import { IconSvgPaths16 } from '@blueprintjs/icons'
import { lang } from 'botpress/shared'
import classnames from 'classnames'
import _ from 'lodash'
import React, { FC, Fragment, useState } from 'react'
import { connect } from 'react-redux'
import { NavLink, RouteComponentProps, withRouter } from 'react-router-dom'
import { RootReducer } from '~/reducers'
import { hitlAccessStore } from '~/utils/token-store'

import { AccessControl } from '../Shared/Utils'

import style from './Sidebar.scss'

type StateProps = ReturnType<typeof mapStateToProps>
type Props = StateProps & RouteComponentProps

const BASIC_MENU_ITEMS = [
  {
    id: 'flows',
    name: lang.tr('flows'),
    path: '/flows',
    rule: { res: 'bot.flows', op: 'read' },
    icon: 'page-layout'
  },
  {
    id: 'content',
    name: lang.tr('content'),
    path: '/content',
    rule: { res: 'bot.content', op: 'read' },
    icon: 'description'
  },
  {
    id: 'nlu',
    name: lang.tr('studio.sideBar.nlu'),
    path: '/nlu',
    rule: { res: 'bot.nlu', op: 'read' },
    icon: 'translate'
  },
  {
    id: 'qna',
    name: lang.tr('qna.fullName'),
    path: '/qna',
    rule: { res: 'module.qna', op: 'write' },
    icon: 'chat'
  },
  // {
  //   id: 'libraries',
  //   name: lang.tr('libraries.fullName'),
  //   path: '/libraries',
  //   rule: { res: 'module.code-editor', op: 'read' },
  //   icon: 'book'
  // }
]

const configItem = {
  id: 'configuration',
  name: lang.tr('configuration'),
  path: '/config',
  rule: { res: 'admin.bots.*', op: 'write' },
  icon: 'cog'
}

const Sidebar: FC<Props> = (props) => {
  const [showHitlDialog, setShowHitlDialog] = useState(false)

  const checkHitlAccess = (e: React.MouseEvent, moduleName: string) => {
    if (moduleName === 'hitl' || moduleName === 'hitlnext') {
      const hitlData = hitlAccessStore.get()

      if (!hitlData || !hitlData.hasAccess) {
        e.preventDefault()
        setShowHitlDialog(true)

        // Auto-close after 5 seconds
        setTimeout(() => {
          setShowHitlDialog(false)
        }, 5000)

        return false
      }
    }
    return true
  }

  const renderModuleItem = (module) => {
    if (module.name === 'code-editor' || module.name === 'misunderstood') {
      return null
    }

    const rule = { res: `module.${module.name}`, op: 'write' }
    const path = `/modules/${module.name}`
    const iconPath = `assets/modules/${module.name}/studio_${module.menuIcon}`

    const moduleIcon =
      module.menuIcon && IconSvgPaths16[module.menuIcon] ? (
        <Icon icon={module.menuIcon as any} iconSize={16} />
      ) : (
        <img src={iconPath} />
      )

    return (
      <AccessControl key={`menu_module_${module.name}`} resource={rule.res} operation={rule.op}>
        <li id={`bp-menu_${module.name}`}>
          <Tooltip
            boundary="window"
            position={Position.RIGHT}
            content={
              <div className={style.tooltipContent}>
                <span>{lang.tr(`module.${module.name}.fullName`) || module.menuText}</span>
                {module.experimental && <span className={style.tag}>Beta</span>}
              </div>
            }
          >
            <NavLink
              to={path}
              title={module.menuText}
              activeClassName={style.active}
              onClick={(e) => checkHitlAccess(e, module.name)}
            >
              {moduleIcon} {module.experimental && <span className={style.small_tag}>Beta</span>}
            </NavLink>
          </Tooltip>
        </li>
      </AccessControl>
    )
  }

  const renderBasicItem = ({ id, name, path, rule, icon }) => (
    <AccessControl resource={rule.res} operation={rule.op} key={id}>
      <li id={`bp-menu_${id}`} key={path}>
        <Tooltip boundary="window" position={Position.RIGHT} content={name}>
          <NavLink to={path} title={name} activeClassName={style.active}>
            {IconSvgPaths16[icon] ? <Icon icon={icon} iconSize={16} /> : <i className="icon material-icons">{icon}</i>}
          </NavLink>
        </Tooltip>
      </li>
    </AccessControl>
  )

  return (
    <aside className={classnames(style.sidebar, 'bp-sidebar')}>
      <a href="admin/" className={classnames(style.logo, 'bp-logo')} id="bp-menu_admin">
        <img width="19" src="assets/studio/ui/public/img/xmati.png" alt="Botpress Logo" />
      </a>
      <ul className={classnames('nav')}>
        {window.IS_BOT_MOUNTED ? (
          <Fragment>
            {BASIC_MENU_ITEMS.map(renderBasicItem)}
            {props.modules.filter((m) => !m.noInterface).map(renderModuleItem)}
            {renderBasicItem(configItem)}
          </Fragment>
        ) : (
          <Fragment>
            {/* {props.modules.filter((m) => m.name === 'code-editor').map(renderModuleItem)}
            {renderBasicItem(configItem)} */}
          </Fragment>
        )}
      </ul>

      <Dialog
        isOpen={showHitlDialog}
        onClose={() => setShowHitlDialog(false)}
        canOutsideClickClose={true}
        canEscapeKeyClose={true}
        style={{ width: 400 }}
      >
        <div className={Classes.DIALOG_BODY}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Icon icon="lock" iconSize={40} style={{ color: '#dc3545', marginBottom: 16 }} />
            <h4 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
              Human In The Loop (HITL) Access Blocked
            </h4>
            <p style={{ color: '#666', marginBottom: 0 }}>
              HITL is only available for Professional subscribers
            </p>
          </div>
        </div>
      </Dialog>
    </aside>
  )
}

const mapStateToProps = (state: RootReducer) => ({
  viewMode: state.ui.viewMode,
  modules: state.modules
})

export default withRouter(connect(mapStateToProps)(Sidebar))
