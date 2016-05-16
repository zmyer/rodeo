import _ from 'lodash';
import React from 'react';
import {connect} from 'react-redux';
import PreferencesList from '../../components/preferences/preferences-list.jsx';
import preferenceActions from './preferences.actions';
import * as store from '../../services/store';
import preferencesMapDefinition from './preferences.yml';
import preferencesMapper from '../../services/preferences-mapper';

import globalSettingsText from './global-settings.md';
import pythonSettingsText from './python-settings.md';
import aceEditorText from './ace-editor.md';
import consoleText from './console.md';
import checkBackLaterPlotSettings from './check-back-later-plot-settings.md';
import checkBackLaterGit from './check-back-later-git.md';
import checkBackLaterProjectSettings from './check-back-later-project-level-settings.md';

const preferencesMap = preferencesMapper.define(preferencesMapDefinition, {
  globalSettingsText,
  pythonSettingsText,
  aceEditorText,
  consoleText,
  checkBackLaterPlotSettings,
  checkBackLaterGit,
  checkBackLaterProjectSettings
});

/**
 * @param {object} state
 * @returns {object}
 */
function mapStateToProps(state) {
  return _.pick(state, ['acePanes', 'splitPanes', 'terminals', 'modalDialogs']);
}

/**
 * @param {function} dispatch
 * @returns {object}
 */
function mapDispatchToProps(dispatch) {
  return {
    onPreferenceChange: (key, value, original) => dispatch(preferenceActions.changePreference(key, value, original))
  };
}

/**
 * @class PreferencesViewer
 * @extends ReactComponent
 * @property props
 * @property state
 */
export default connect(mapStateToProps, mapDispatchToProps)(React.createClass({
  displayName: 'PreferencesViewer',
  propTypes: {
    onClose: React.PropTypes.func,
    onPreferenceChange: React.PropTypes.func
  },
  getDefaultProps: function () {
    return {
      onClose: _.noop
    };
  },
  getInitialState: function () {
    return {
      active: '',
      changes: {}
    };
  },
  componentWillMount: function () {
    // set active tab to first item
    let activePreferenceGroup = _.head(preferencesMap),
      active = activePreferenceGroup.id;

    if (!active) {
      throw new Error('Configuration error: missing content in preference map');
    }

    this.setState({active: activePreferenceGroup.id});
  },
  handleTabClick: function (active) {
    const state = this.state;

    // only allow them to change tabs if they have no unsaved changes
    if (_.size(state.changes) === 0) {
      this.setState({active});
    }
  },
  /**
   * Remember change.
   * @param {object} item
   * @param {string} item.key
   * @param {Event} event
   */
  handleChange: function (item, event) {
    let changes = this.state.changes,
      newValue = event.target.value,
      key = item.key;

    if (store.get(key) === newValue && changes[key]) {
      // if they set it back to the current settings, remove it from the map of changes.
      this.setKeyUnchanged(key);
    } else if (changes[key] !== newValue) {
      // if it's a new value than what we currently have, or if it wasn't changed yet, save it as a change.
      preferencesMapper.isValid(item, newValue)
      // if it's a new value than what we currently have, or if it wasn't changed yet, save it as a change.
        .then((valid) => {
          if (_.every(valid, result => !!result)) {
            return this.setKeyChanged(key, newValue);
          }
          this.setKeyInvalid(key, newValue);
        })
        // if anything bad happens, it's invalid
        .catch(_.partial(this.setKeyInvalid, key, newValue));
    }
  },
  setKeyUnchanged: function (key) {
    let changes = this.state.changes;

    changes = _.clone(changes);
    delete changes[key];
    this.setState({changes});
  },
  setKeyChanged: function (key, newValue) {
    let changes = this.state.changes;

    changes = _.clone(changes);
    changes[key] = {value: newValue, state: 'changed'};
    this.setState({changes});
  },
  setKeyInvalid: function (key, newValue, error) {
    let changes = this.state.changes;

    if (error) {
      console.warn('Invalid key', key, 'of', newValue, error);
    }

    changes = _.clone(changes);
    changes[key] = {value: newValue, state: 'invalid'};
    this.setState({changes});
  },
  canSave: function () {
    const state = this.state,
      changes = state.changes;

    return _.every(changes, {state: 'changed'});
  },
  /**
   * Discard changes, close.
   */
  handleCancel: function () {
    const props = this.props;

    this.setState({changes: {}});
    props.onClose();
  },
  /**
   * Save the changed keys, do not close.
   */
  handleSave: function () {
    const state = this.state,
      changes = state.changes;

    // only save if there are no invalid entries
    if (this.canSave()) {
      _.each(changes, (item, key) => this.props.onPreferenceChange(key, item.value, item.original));

      this.setState({changes: {}});
    }
  },
  /**
   * Save the changed keys, close.
   */
  handleOK: function () {
    const state = this.state,
      props = this.props;

    if (_.size(state.changes) === 0) {
      // they made no changes, close
      props.onClose();
    } else {
      // same as saving and then closing
      if (this.canSave()) {
        this.handleSave();
        props.onClose();
      }
    }
  },
  render: function () {
    const state = this.state;

    console.log('preferencesMap', preferencesMap);

    return (
      <PreferencesList
        active={state.active}
        changes={state.changes}
        isSaveEnabled={_.size(this.state.changes) > 0}
        onApply={this.handleSave}
        onCancel={this.handleCancel}
        onChange={this.handleChange}
        onOK={this.handleOK}
        onTabClick={this.handleTabClick}
        preferencesMap={preferencesMap}
      />
    );
  }
}));
