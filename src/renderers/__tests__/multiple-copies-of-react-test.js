/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */

'use strict';

let React = require('react');
var ReactTestUtils = require('react-dom/test-utils');

class TextWithStringRef extends React.Component {
  render() {
    jest.resetModules();
    React = require('react');
    return (
      <span ref="foo">
        Hello world!
      </span>
    );
  }
}

describe('when different React version is used with string ref', () => {
  it('throws the "Refs must have owner" warning', () => {
    expect(() => {
      ReactTestUtils.renderIntoDocument(<TextWithStringRef />);
    }).toThrow(
      'Element ref was specified as a string (foo) but no owner was set.' +
        ' You may have multiple copies of React loaded. (details: ' +
        'https://fb.me/react-refs-must-have-owner).',
    );
  });
});
