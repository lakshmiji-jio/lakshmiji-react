/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule getComponentName
 * @flow
 */

'use strict';

import type {Fiber} from 'ReactFiber';

function getComponentName(fiber: Fiber): string | null {
  if (typeof fiber.tag === 'number') {
    // Fiber reconciler
    const {type} = fiber;
    if (typeof type === 'string') {
      return type;
    }
    if (typeof type === 'function') {
      return type.displayName || type.name;
    }
  }
  return null;
}

module.exports = getComponentName;
