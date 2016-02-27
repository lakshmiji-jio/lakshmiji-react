/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactDefaultPerf
 */

'use strict';

var DOMProperty = require('DOMProperty');
var ReactDOMComponentTree = require('ReactDOMComponentTree');
var ReactDefaultPerfAnalysis = require('ReactDefaultPerfAnalysis');
var ReactMount = require('ReactMount');
var ReactPerf = require('ReactPerf');

var performanceNow = require('performanceNow');

function roundFloat(val) {
  return Math.floor(val * 100) / 100;
}

function addValue(obj, key, val) {
  obj[key] = (obj[key] || 0) + val;
}

// Composite/text components don't have any built-in ID: we have to make our own
var compositeIDMap;
var compositeIDCounter = 17000;
function getIDOfComposite(inst) {
  if (!compositeIDMap) {
    compositeIDMap = new WeakMap();
  }
  if (compositeIDMap.has(inst)) {
    return compositeIDMap.get(inst);
  } else {
    var id = compositeIDCounter++;
    compositeIDMap.set(inst, id);
    return id;
  }
}

function getID(inst) {
  if (inst.hasOwnProperty('_rootNodeID')) {
    return inst._rootNodeID;
  } else {
    return getIDOfComposite(inst);
  }
}

var ReactDefaultPerf = {
  _allMeasurements: [], // last item in the list is the current one
  _mountStack: [0],
  _compositeStack: [],
  _injected: false,

  start: function() {
    if (!ReactDefaultPerf._injected) {
      ReactPerf.injection.injectMeasure(ReactDefaultPerf.measure);
    }

    ReactDefaultPerf._allMeasurements.length = 0;
    ReactPerf.enableMeasure = true;
  },

  stop: function() {
    ReactPerf.enableMeasure = false;
  },

  getLastMeasurements: function() {
    return ReactDefaultPerf._allMeasurements;
  },

  printExclusive: function(measurements) {
    measurements = measurements || ReactDefaultPerf._allMeasurements;
    var summary = ReactDefaultPerfAnalysis.getExclusiveSummary(measurements);
    console.table(summary.map(function(item) {
      return {
        'Component class name': item.componentName,
        'Total inclusive time (ms)': roundFloat(item.inclusive),
        'Exclusive mount time (ms)': roundFloat(item.exclusive),
        'Exclusive render time (ms)': roundFloat(item.render),
        'Mount time per instance (ms)': roundFloat(item.exclusive / item.count),
        'Render time per instance (ms)': roundFloat(item.render / item.count),
        'Instances': item.count,
      };
    }));
    // TODO: ReactDefaultPerfAnalysis.getTotalTime() does not return the correct
    // number.
  },

  printInclusive: function(measurements) {
    measurements = measurements || ReactDefaultPerf._allMeasurements;
    var summary = ReactDefaultPerfAnalysis.getInclusiveSummary(measurements);
    console.table(summary.map(function(item) {
      return {
        'Owner > component': item.componentName,
        'Inclusive time (ms)': roundFloat(item.time),
        'Instances': item.count,
      };
    }));
    console.log(
      'Total time:',
      ReactDefaultPerfAnalysis.getTotalTime(measurements).toFixed(2) + ' ms'
    );
  },

  getMeasurementsSummaryMap: function(measurements) {
    var summary = ReactDefaultPerfAnalysis.getInclusiveSummary(
      measurements,
      true
    );
    return summary.map(function(item) {
      return {
        'Owner > component': item.componentName,
        'Wasted time (ms)': item.time,
        'Instances': item.count,
      };
    });
  },
  /**
   * Pass all measurements to PerfAnalysis, then flatten
   * @param  {array} measurements measurements taken by DefaultPerf
   * @return {array} array of flattened objects
   */
  getLifecyclesSummaryMap: function(measurements) {
    var summary = ReactDefaultPerfAnalysis.getLifecycleSummary(
      measurements
    );
    return summary.map(function(item) {
      var flattenedItem = {
        id: item.id,
      };
      var lifecycles = Object.keys(item.measures);
      lifecycles.forEach(function(method) {
        flattenedItem[method] = item.measures[method];
      });
      return flattenedItem;
    });
  },

  printWasted: function(measurements) {
    measurements = measurements || ReactDefaultPerf._allMeasurements;
    console.table(ReactDefaultPerf.getMeasurementsSummaryMap(measurements));
    console.log(
      'Total time:',
      ReactDefaultPerfAnalysis.getTotalTime(measurements).toFixed(2) + ' ms'
    );
  },

  printDOM: function(measurements) {
    measurements = measurements || ReactDefaultPerf._allMeasurements;
    var summary = ReactDefaultPerfAnalysis.getDOMSummary(measurements);
    console.table(summary.map(function(item) {
      var result = {};
      result[DOMProperty.ID_ATTRIBUTE_NAME] = item.id;
      result.type = item.type;
      result.args = JSON.stringify(item.args);
      return result;
    }));
    console.log(
      'Total time:',
      ReactDefaultPerfAnalysis.getTotalTime(measurements).toFixed(2) + ' ms'
    );
  },
  /**
   * prints table of components and their lifecycle counts
   * @param  {array} measurements array of measurements taken by DefaultPerf
   */
  printLifecycles: function(measurements) {
    measurements = measurements || ReactDefaultPerf._allMeasurements[
      ReactDefaultPerf._allMeasurements.length - 1
    ];
    var components = measurements.components;
    var summary = ReactDefaultPerfAnalysis.getLifecycleSummary(components);
    console.table(summary.map(function(item) {
      var result = {};
      var keys = Object.keys(item);
      keys.forEach(function(key) {
        if (key === 'id') {
          result.id = item[key];
        } else {
          result[key] = item[key].count;
        }
      });
      return result;
    }));
  },
  _recordWrite: function(id, fnName, totalTime, args) {
    // TODO: totalTime isn't that useful since it doesn't count paints/reflows
    var entry =
      ReactDefaultPerf
        ._allMeasurements[ReactDefaultPerf._allMeasurements.length - 1];
    var writes = entry.writes;
    writes[id] = writes[id] || [];
    writes[id].push({
      type: fnName,
      time: totalTime,
      args: args,
    });
  },

  measure: function(moduleName, fnName, func) {
    return function(...args) {
      var totalTime;
      var rv;
      var start;

      var entry = ReactDefaultPerf._allMeasurements[
        ReactDefaultPerf._allMeasurements.length - 1
      ];

      if (fnName === '_renderNewRootComponent' ||
          fnName === 'flushBatchedUpdates') {
        var components;

        if (fnName === 'flushBatchedUpdates' && ReactDefaultPerf._allMeasurements.length) {
          // between flushes, measurements get destroyed but we wanna keep
          // tracking of the lifecycle methods so save off then reattach below
          components = ReactDefaultPerf._allMeasurements[
            ReactDefaultPerf._allMeasurements.length - 1
          ].components;
        }
        // A "measurement" is a set of metrics recorded for each flush. We want
        // to group the metrics for a given flush together so we can look at the
        // components that rendered and the DOM operations that actually
        // happened to determine the amount of "wasted work" performed.
        ReactDefaultPerf._allMeasurements.push(entry = {
          exclusive: {},
          inclusive: {},
          render: {},
          counts: {},
          writes: {},
          displayNames: {},
          hierarchy: {},
          totalTime: 0,
          created: {},
          components: {}, // all components and any defined lifecycle methods
        });

        if (fnName === 'flushBatchedUpdates' &&
            components !== null && ReactDefaultPerf._allMeasurements.length) {
          // reattach components saved off from above
          ReactDefaultPerf._allMeasurements[
            ReactDefaultPerf._allMeasurements.length - 1
          ].components = components;
        }

        start = performanceNow();
        rv = func.apply(this, args);
        entry.totalTime = performanceNow() - start;
        return rv;
      } else if (fnName === '_mountImageIntoNode' ||
          moduleName === 'ReactDOMIDOperations' ||
          moduleName === 'CSSPropertyOperations' ||
          moduleName === 'DOMChildrenOperations' ||
          moduleName === 'DOMPropertyOperations' ||
          moduleName === 'ReactComponentBrowserEnvironment') {
        start = performanceNow();
        rv = func.apply(this, args);
        totalTime = performanceNow() - start;

        if (fnName === '_mountImageIntoNode') {
          ReactDefaultPerf._recordWrite('', fnName, totalTime, args[0]);
        } else if (fnName === 'dangerouslyProcessChildrenUpdates') {
          // special format
          args[1].forEach(function(update) {
            var writeArgs = {};
            if (update.fromIndex !== null) {
              writeArgs.fromIndex = update.fromIndex;
            }
            if (update.toIndex !== null) {
              writeArgs.toIndex = update.toIndex;
            }
            if (update.content !== null) {
              writeArgs.content = update.content;
            }
            ReactDefaultPerf._recordWrite(
              args[0]._rootNodeID,
              update.type,
              totalTime,
              writeArgs
            );
          });
        } else {
          // basic format
          var id = args[0];
          if (moduleName === 'EventPluginHub') {
            id = id._rootNodeID;
          } else if (fnName === 'replaceNodeWithMarkup') {
            // Old node is already unmounted; can't get its instance
            id = ReactDOMComponentTree.getInstanceFromNode(args[1].node)._rootNodeID;
          } else if (fnName === 'replaceDelimitedText') {
            id = getID(ReactDOMComponentTree.getInstanceFromNode(args[0]));
          } else if (typeof id === 'object') {
            id = getID(ReactDOMComponentTree.getInstanceFromNode(args[0]));
          }
          ReactDefaultPerf._recordWrite(
            id,
            fnName,
            totalTime,
            Array.prototype.slice.call(args, 1)
          );
        }
        return rv;
      } else if (moduleName === 'ReactCompositeComponent' && (
        fnName === 'mountComponent' ||
        fnName === 'updateComponent' || // TODO: receiveComponent()?
        fnName === '_renderValidatedComponent')) {

        if (this._currentElement.type === ReactMount.TopLevelWrapper) {
          return func.apply(this, args);
        }

        var rootNodeID = getIDOfComposite(this);
        var isRender = fnName === '_renderValidatedComponent';
        var isMount = fnName === 'mountComponent';

        var mountStack = ReactDefaultPerf._mountStack;

        if (isRender) {
          addValue(entry.counts, rootNodeID, 1);
        } else if (isMount) {
          entry.created[rootNodeID] = true;
          mountStack.push(0);
        }

        ReactDefaultPerf._compositeStack.push(rootNodeID);

        start = performanceNow();
        rv = func.apply(this, args);
        totalTime = performanceNow() - start;

        ReactDefaultPerf._compositeStack.pop();

        if (isRender) {
          addValue(entry.render, rootNodeID, totalTime);
        } else if (isMount) {
          var subMountTime = mountStack.pop();
          mountStack[mountStack.length - 1] += totalTime;
          addValue(entry.exclusive, rootNodeID, totalTime - subMountTime);
          addValue(entry.inclusive, rootNodeID, totalTime);
        } else {
          addValue(entry.inclusive, rootNodeID, totalTime);
        }

        entry.displayNames[rootNodeID] = {
          current: this.getName(),
          owner: this._currentElement._owner ?
            this._currentElement._owner.getName() :
            '<root>',
        };

        return rv;
      } else if (
        (moduleName === 'ReactDOMComponent' ||
         moduleName === 'ReactDOMTextComponent') &&
        (fnName === 'mountComponent' ||
         fnName === 'receiveComponent')) {

        rv = func.apply(this, args);
        entry.hierarchy[getID(this)] =
          ReactDefaultPerf._compositeStack.slice();
        return rv;
      } else if (moduleName === 'ReactCompositeComponent') {
        // TODO: defined in if/else should just be defined where hoisted
        entry = ReactDefaultPerf._allMeasurements[
          ReactDefaultPerf._allMeasurements.length - 1
        ];

        start = performanceNow();
        rv = func.apply(this, args);
        totalTime = performanceNow() - start;

        // TODO: warn if no keys? assign a key? assign a random?
        var reactId = this._reactInternalInstance._currentElement.key; // 0, 0.0, 0.1, etc.

        if (!entry.components[reactId]) {
          // first time we perf measure the component at all
          entry.components[reactId] = {};
          entry.components[reactId][fnName] = {
            count: 1,
            totalTime: totalTime,
            averageTime: totalTime,
          };
        } else if (!(entry.components[reactId])[fnName]) {
          // first time we perf a new method after initial perf above
          entry.components[reactId][fnName]= {
            count: 1,
            totalTime: totalTime,
            averageTime: totalTime,
          };
        } else {
          // any subsequent perf on a known method
          entry.components[reactId][fnName].count += 1;
          entry.components[reactId][fnName].totalTime += totalTime;
          entry.components[reactId][fnName].averageTime =
            totalTime / entry.components[reactId][fnName].count;
        }
        return func.apply(this, args);
      } else {
        return func.apply(this, args);
      }
    };
  },
};

module.exports = ReactDefaultPerf;
