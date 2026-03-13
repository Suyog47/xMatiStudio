import { Classes, Dialog, Icon } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import _ from 'lodash'
import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'

import InjectedModuleView from '~/components/PluginInjectionSite/module'
import { hitlAccessStore } from '~/utils/token-store'

class ModuleView extends React.Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  state = {
    showHitlDialog: false
  }

  shouldComponentUpdate(nextProps) {
    return JSON.stringify(nextProps) !== JSON.stringify(this.props)
  }

  componentDidMount() {
    const { moduleName } = this.props.match.params

    // Check HITL access when mounting HITL module
    if (moduleName === 'hitl' || moduleName === 'hitl-next') {
      const hitlData = hitlAccessStore.get()

      if (!hitlData || !hitlData.hasAccess) {
        this.setState({ showHitlDialog: true })

        // Auto-close after 5 seconds and redirect
        setTimeout(() => {
          this.setState({ showHitlDialog: false })
          this.context.router.history.push('/flows')
        }, 5000)
      }
    }
  }

  renderNotFound(err) {
    return (
      <div className="panel panel-warning">
        <div className="panel-heading">{lang.tr('studio.flow.module.notFound')}</div>
        <div className="panel-body">
          <h4>{lang.tr('studio.flow.module.notProperlyRegistered')}</h4>
          <p>{lang.tr('studio.flow.module.tryingToLoad')}</p>
          {err && <p>{err}</p>}
          <p>
            {/* TODO update doc & help */}
            <a role="button" className="btn btn-primary btn-lg">
              {lang.tr('studio.flow.module.learnMore')}
            </a>
          </p>
        </div>
      </div>
    )
  }

  render() {
    const modules = this.props.modules
    if (!modules) {
      return null
    }

    const { moduleName, componentName } = this.props.match.params
    const module = _.find(modules, { name: moduleName })

    return (
      <React.Fragment>
        {module ? (
          <InjectedModuleView
            moduleName={moduleName}
            componentName={componentName}
            onNotFound={this.renderNotFound}
            contentLang={this.props.contentLang}
            defaultLanguage={this.props.defaultLanguage}
            languages={this.props.languages}
          />
        ) : (
          this.renderNotFound()
        )}

        <Dialog
          isOpen={this.state.showHitlDialog}
          onClose={() => {
            this.setState({ showHitlDialog: false })
            this.context.router.history.push('/flows')
          }}
          canOutsideClickClose={true}
          canEscapeKeyClose={true}
          style={{ width: 400 }}
        >
          <div className={Classes.DIALOG_BODY}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Icon icon="lock" iconSize={40} style={{ color: '#dc3545', marginBottom: 16 }} />
              <h4 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
                HITL Access Required
              </h4>
              <p style={{ color: '#666', marginBottom: 0 }}>
                HITL is only available for Professional subscribers
              </p>
            </div>
          </div>
        </Dialog>
      </React.Fragment>
    )
  }
}

const mapStateToProps = state => ({
  modules: state.modules,
  contentLang: state.language.contentLang,
  defaultLanguage: state.bot.defaultLanguage,
  languages: state.bot.languages
})

export default connect(mapStateToProps)(ModuleView)
