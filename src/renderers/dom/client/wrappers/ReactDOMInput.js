/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactDOMInput
 */

'use strict';

var ReactDOMIDOperations = require('ReactDOMIDOperations');
var LinkedValueUtils = require('LinkedValueUtils');
var ReactMount = require('ReactMount');
var ReactUpdates = require('ReactUpdates');

var assign = require('Object.assign');
var invariant = require('invariant');
var warning = require('warning');

var instancesByReactID = {};

var didWarnValueLink = false;
var didWarnCheckedLink = false;

function forceUpdateIfMounted() {
  if (this._rootNodeID) {
    // DOM component is still mounted; update
    ReactDOMInput.updateWrapper(this);
  }
}

function hasPlaceholder(props) {
  return 'placeholder' in props;
}

/**
 * Implements an <input> native component that allows setting these optional
 * props: `checked`, `value`, `defaultChecked`, and `defaultValue`.
 *
 * If `checked` or `value` are not supplied (or null/undefined), user actions
 * that affect the checked state or value will trigger updates to the element.
 *
 * If they are supplied (and not null/undefined), the rendered element will not
 * trigger updates to the element. Instead, the props must change in order for
 * the rendered element to be updated.
 *
 * The rendered element will be initialized as unchecked (or `defaultChecked`)
 * with an empty value (or `defaultValue`).
 *
 * @see http://www.w3.org/TR/2012/WD-html5-20121025/the-input-element.html
 */
var ReactDOMInput = {
  getNativeProps: function(inst, props) {
    var value = LinkedValueUtils.getValue(props);
    var checked = LinkedValueUtils.getChecked(props);

    var nativeProps = assign({}, props, {
      defaultChecked: undefined,
      defaultValue: undefined,
      value: value != null ? value : inst._wrapperState.initialValue,
      checked: checked != null ? checked : inst._wrapperState.initialChecked,
      onChange: inst._wrapperState.onChange,
    });

    return nativeProps;
  },

  mountWrapper: function(inst, props) {
    if (__DEV__) {
      LinkedValueUtils.checkPropTypes(
        'input',
        props,
        inst._currentElement._owner
      );

      if (props.valueLink !== undefined && !didWarnValueLink) {
        warning(
          false,
          '`valueLink` prop on `input` is deprecated; set `value` and `onChange` instead.'
        );
        didWarnValueLink = true;
      }
      if (props.checkedLink !== undefined && !didWarnCheckedLink) {
        warning(
          false,
          '`checkedLink` prop on `input` is deprecated; set `value` and `onChange` instead.'
        );
        didWarnCheckedLink = true;
      }
    }

    var defaultValue = props.defaultValue;
    inst._wrapperState = {
      initialChecked: props.defaultChecked || false,
      initialValue: defaultValue != null ? defaultValue : null,
      onChange: _handleChange.bind(inst),
      _currentValue: '',
    };
  },

  mountReadyWrapper: function(inst) {
    // Can't be in mountWrapper or else server rendering leaks.
    instancesByReactID[inst._rootNodeID] = inst;
    var rootNode = ReactMount.getNode(inst._rootNodeID);
    if (hasPlaceholder(inst._currentElement.props)) {
      inst._wrapperState._currentValue = rootNode.value;
    }
  },

  unmountWrapper: function(inst) {
    delete instancesByReactID[inst._rootNodeID];
  },

  updateWrapper: function(inst) {
    var props = inst._currentElement.props;

    // TODO: Shouldn't this be getChecked(props)?
    var checked = props.checked;
    if (checked != null) {
      ReactDOMIDOperations.updatePropertyByID(
        inst._rootNodeID,
        'checked',
        checked || false
      );
    }

    var value = LinkedValueUtils.getValue(props);
    if (value != null) {
      // Cast `value` to a string to ensure the value is set correctly. While
      // browsers typically do this as necessary, jsdom doesn't.
      value = '' + value;
      ReactDOMIDOperations.updatePropertyByID(
        inst._rootNodeID,
        'value',
        value
      );
      if (hasPlaceholder(props)) {
        inst._wrapperState._currentValue = value;
      }
    }
  },
};

function _handleChange(event) {
  var props = this._currentElement.props;

  // #5004: IE fires input event for placeholder wrongly
  if (hasPlaceholder(props)) {
    var value = event.target.value;
    if (value === this._wrapperState._currentValue) {
      event.stopPropagation();
      return undefined;
    }
    this._wrapperState._currentValue = value;
  }

  var returnValue = LinkedValueUtils.executeOnChange(props, event);

  // Here we use asap to wait until all updates have propagated, which
  // is important when using controlled components within layers:
  // https://github.com/facebook/react/issues/1698
  ReactUpdates.asap(forceUpdateIfMounted, this);

  var name = props.name;
  if (props.type === 'radio' && name != null) {
    var rootNode = ReactMount.getNode(this._rootNodeID);
    var queryRoot = rootNode;

    while (queryRoot.parentNode) {
      queryRoot = queryRoot.parentNode;
    }

    // If `rootNode.form` was non-null, then we could try `form.elements`,
    // but that sometimes behaves strangely in IE8. We could also try using
    // `form.getElementsByName`, but that will only return direct children
    // and won't include inputs that use the HTML5 `form=` attribute. Since
    // the input might not even be in a form, let's just use the global
    // `querySelectorAll` to ensure we don't miss anything.
    var group = queryRoot.querySelectorAll(
      'input[name=' + JSON.stringify('' + name) + '][type="radio"]');

    for (var i = 0; i < group.length; i++) {
      var otherNode = group[i];
      if (otherNode === rootNode ||
          otherNode.form !== rootNode.form) {
        continue;
      }
      // This will throw if radio buttons rendered by different copies of React
      // and the same name are rendered into the same form (same as #1939).
      // That's probably okay; we don't support it just as we don't support
      // mixing React with non-React.
      var otherID = ReactMount.getID(otherNode);
      invariant(
        otherID,
        'ReactDOMInput: Mixing React and non-React radio inputs with the ' +
        'same `name` is not supported.'
      );
      var otherInstance = instancesByReactID[otherID];
      invariant(
        otherInstance,
        'ReactDOMInput: Unknown radio button ID %s.',
        otherID
      );
      // If this is a controlled radio button group, forcing the input that
      // was previously checked to update will cause it to be come re-checked
      // as appropriate.
      ReactUpdates.asap(forceUpdateIfMounted, otherInstance);
    }
  }

  return returnValue;
}

module.exports = ReactDOMInput;
