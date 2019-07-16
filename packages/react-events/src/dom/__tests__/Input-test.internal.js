/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactFeatureFlags;
let ReactDOM;
let Input;
let Press;
let Scheduler;

const setUntrackedChecked = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'checked',
).set;

const setUntrackedValue = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value',
).set;

const setUntrackedTextareaValue = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  'value',
).set;

const modulesInit = () => {
  ReactFeatureFlags = require('shared/ReactFeatureFlags');
  ReactFeatureFlags.enableFlareAPI = true;
  ReactFeatureFlags.debugRenderPhaseSideEffectsForStrictMode = false;
  ReactFeatureFlags.enableUserBlockingEvents = true;
  React = require('react');
  ReactDOM = require('react-dom');
  Scheduler = require('scheduler');
  Input = require('react-events/input').Input;
  Press = require('react-events/press').Press;
};

describe('Input event responder', () => {
  let container;

  beforeEach(() => {
    jest.resetModules();
    modulesInit();

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  describe('disabled', () => {
    let onChange, onValueChange, ref;

    beforeEach(() => {
      onChange = jest.fn();
      onValueChange = jest.fn();
      ref = React.createRef();
      const element = (
        <Input
          disabled={true}
          onChange={onChange}
          onValueChange={onValueChange}>
          <input ref={ref} />
        </Input>
      );
      ReactDOM.render(element, container);
    });

    it('prevents custom events being dispatched', () => {
      ref.current.dispatchEvent(
        new Event('change', {bubbles: true, cancelable: true}),
      );
      ref.current.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      expect(onChange).not.toBeCalled();
      expect(onValueChange).not.toBeCalled();
    });
  });

  // These were taken from the original ChangeEventPlugin-test.
  // They've been updated and cleaned up for React Flare.
  describe('onChange', () => {
    // We try to avoid firing "duplicate" React change events.
    // However, to tell which events are "duplicates" and should be ignored,
    // we are tracking the "current" input value, and only respect events
    // that occur after it changes. In most of these tests, we verify that we
    // keep track of the "current" value and only fire events when it changes.
    // See https://github.com/facebook/react/pull/5746.

    it('should consider initial text value to be current', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ReactDOM.render(
        <Input onChange={onChange} onValueChange={onValueChange}>
          <input type="text" ref={ref} defaultValue="foo" />
        </Input>,
        container,
      );
      ref.current.dispatchEvent(
        new Event('change', {bubbles: true, cancelable: true}),
      );
      ref.current.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      expect(onChangeCalled).toBe(0);
      expect(onValueChangeCalled).toBe(0);
    });

    it('should consider initial checkbox checked=true to be current', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ReactDOM.render(
        <Input onChange={onChange} onValueChange={onValueChange}>
          <input type="checkbox" ref={ref} defaultChecked={true} />
        </Input>,
        container,
      );

      // Secretly, set `checked` to false, so that dispatching the `click` will
      // make it `true` again. Thus, at the time of the event, React should not
      // consider it a change from the initial `true` value.
      setUntrackedChecked.call(ref.current, false);
      ref.current.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );

      // There should be no React change events because the value stayed the same.
      expect(onChangeCalled).toBe(0);
      expect(onValueChangeCalled).toBe(0);
    });

    it('should consider initial checkbox checked=false to be current', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ReactDOM.render(
        <Input onChange={onChange} onValueChange={onValueChange}>
          <input type="checkbox" ref={ref} defaultChecked={false} />
        </Input>,
        container,
      );

      // Secretly, set `checked` to true, so that dispatching the `click` will
      // make it `false` again. Thus, at the time of the event, React should not
      // consider it a change from the initial `false` value.
      setUntrackedChecked.call(ref.current, true);
      ref.current.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );
      // There should be no React change events because the value stayed the same.
      expect(onChangeCalled).toBe(0);
      expect(onValueChangeCalled).toBe(0);
    });

    it('should fire change for checkbox input', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ReactDOM.render(
        <Input onChange={onChange} onValueChange={onValueChange}>
          <input type="checkbox" ref={ref} />
        </Input>,
        container,
      );

      ref.current.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );
      // Note: unlike with text input events, dispatching `click` actually
      // toggles the checkbox and updates its `checked` value.
      expect(ref.current.checked).toBe(true);
      expect(onChangeCalled).toBe(1);
      expect(onValueChangeCalled).toBe(1);

      expect(ref.current.checked).toBe(true);
      ref.current.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );
      expect(ref.current.checked).toBe(false);
      expect(onChangeCalled).toBe(2);
      expect(onValueChangeCalled).toBe(2);
    });

    it('should not fire change setting the value programmatically', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ReactDOM.render(
        <Input onChange={onChange} onValueChange={onValueChange}>
          <input type="text" defaultValue="foo" ref={ref} />
        </Input>,
        container,
      );

      // Set it programmatically.
      ref.current.value = 'bar';
      // Even if a DOM input event fires, React sees that the real input value now
      // ('bar') is the same as the "current" one we already recorded.
      ref.current.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      expect(ref.current.value).toBe('bar');
      // In this case we don't expect to get a React event.
      expect(onChangeCalled).toBe(0);
      expect(onValueChangeCalled).toBe(0);

      // However, we can simulate user typing by calling the underlying setter.
      setUntrackedValue.call(ref.current, 'foo');
      // Now, when the event fires, the real input value ('foo') differs from the
      // "current" one we previously recorded ('bar').
      ref.current.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      expect(ref.current.value).toBe('foo');
      // In this case React should fire an event for it.
      expect(onChangeCalled).toBe(1);
      expect(onValueChangeCalled).toBe(1);

      // Verify again that extra events without real changes are ignored.
      ref.current.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      expect(onChangeCalled).toBe(1);
      expect(onValueChangeCalled).toBe(1);
    });

    it('should not distinguish equal string and number values', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ReactDOM.render(
        <Input onChange={onChange} onValueChange={onValueChange}>
          <input type="text" defaultValue="42" ref={ref} />
        </Input>,
        container,
      );

      // When we set `value` as a property, React updates the "current" value
      // that it tracks internally. The "current" value is later used to determine
      // whether a change event is a duplicate or not.
      // Even though we set value to a number, we still shouldn't get a change
      // event because as a string, it's equal to the initial value ('42').
      ref.current.value = 42;
      ref.current.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      expect(ref.current.value).toBe('42');
      expect(onChangeCalled).toBe(0);
      expect(onValueChangeCalled).toBe(0);
    });

    // See a similar input test above for a detailed description of why.
    it('should not fire change when setting checked programmatically', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ReactDOM.render(
        <Input onChange={onChange} onValueChange={onValueChange}>
          <input type="checkbox" defaultChecked={false} ref={ref} />
        </Input>,
        container,
      );

      // Set the value, updating the "current" value that React tracks to true.
      ref.current.checked = true;
      // Under the hood, uncheck the box so that the click will "check" it again.
      setUntrackedChecked.call(ref.current, false);
      ref.current.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );
      expect(ref.current.checked).toBe(true);
      // We don't expect a React event because at the time of the click, the real
      // checked value (true) was the same as the last recorded "current" value
      // (also true).
      expect(onChangeCalled).toBe(0);
      expect(onValueChangeCalled).toBe(0);

      // However, simulating a normal click should fire a React event because the
      // real value (false) would have changed from the last tracked value (true).
      ref.current.dispatchEvent(
        new Event('click', {bubbles: true, cancelable: true}),
      );
      expect(onChangeCalled).toBe(1);
      expect(onValueChangeCalled).toBe(1);
    });

    it('should only fire change for checked radio button once', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ReactDOM.render(
        <Input onChange={onChange} onValueChange={onValueChange}>
          <input type="radio" ref={ref} />
        </Input>,
        container,
      );

      setUntrackedChecked.call(ref.current, true);
      ref.current.dispatchEvent(
        new Event('click', {bubbles: true, cancelable: true}),
      );
      ref.current.dispatchEvent(
        new Event('click', {bubbles: true, cancelable: true}),
      );
      expect(onChangeCalled).toBe(1);
      expect(onValueChangeCalled).toBe(1);
    });

    it('should track radio button cousins in a group', () => {
      let onChangeCalled1 = 0;
      let onValueChangeCalled1 = 0;
      let onChangeCalled2 = 0;
      let onValueChangeCalled2 = 0;
      const ref = React.createRef();

      function onChange1(e) {
        onChangeCalled1++;
        expect(e.type).toBe('change');
      }

      function onValueChange1(e) {
        onValueChangeCalled1++;
      }

      function onChange2(e) {
        onChangeCalled2++;
        expect(e.type).toBe('change');
      }

      function onValueChange2(e) {
        onValueChangeCalled2++;
      }

      ReactDOM.render(
        <div ref={ref}>
          <Input onChange={onChange1} onValueChange={onValueChange1}>
            <input type="radio" name="group" />
          </Input>
          <Input onChange={onChange2} onValueChange={onValueChange2}>
            <input type="radio" name="group" />
          </Input>
        </div>,
        container,
      );
      const option1 = ref.current.childNodes[0];
      const option2 = ref.current.childNodes[1];

      // Select first option.
      option1.dispatchEvent(
        new Event('click', {bubbles: true, cancelable: true}),
      );
      expect(onChangeCalled1).toBe(1);
      expect(onValueChangeCalled1).toBe(1);
      expect(onChangeCalled2).toBe(0);
      expect(onValueChangeCalled2).toBe(0);

      // Select second option.
      option2.dispatchEvent(
        new Event('click', {bubbles: true, cancelable: true}),
      );
      expect(onChangeCalled1).toBe(1);
      expect(onValueChangeCalled1).toBe(1);
      expect(onChangeCalled2).toBe(1);
      expect(onValueChangeCalled2).toBe(1);

      // Select the first option.
      // It should receive the React change event again.
      option1.dispatchEvent(
        new Event('click', {bubbles: true, cancelable: true}),
      );
      expect(onChangeCalled1).toBe(2);
      expect(onValueChangeCalled1).toBe(2);
      expect(onChangeCalled2).toBe(1);
      expect(onValueChangeCalled2).toBe(1);
    });

    it('should deduplicate input value change events', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ['text', 'number', 'range'].forEach(type => {
        onChangeCalled = 0;
        onValueChangeCalled = 0;
        ReactDOM.render(
          <Input onChange={onChange} onValueChange={onValueChange}>
            <input type={type} name="group" ref={ref} />
          </Input>,
          container,
        );
        // Should be ignored (no change):
        ref.current.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
        setUntrackedValue.call(ref.current, '42');
        ref.current.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
        // Should be ignored (no change):
        ref.current.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
        expect(onChangeCalled).toBe(1);
        expect(onValueChangeCalled).toBe(1);
        ReactDOM.unmountComponentAtNode(container);

        onChangeCalled = 0;
        onValueChangeCalled = 0;
        ReactDOM.render(
          <Input onChange={onChange} onValueChange={onValueChange}>
            <input type={type} ref={ref} />
          </Input>,
          container,
        );
        // Should be ignored (no change):
        ref.current.dispatchEvent(
          new Event('input', {bubbles: true, cancelable: true}),
        );
        setUntrackedValue.call(ref.current, '42');
        ref.current.dispatchEvent(
          new Event('input', {bubbles: true, cancelable: true}),
        );
        // Should be ignored (no change):
        ref.current.dispatchEvent(
          new Event('input', {bubbles: true, cancelable: true}),
        );
        expect(onChangeCalled).toBe(1);
        expect(onValueChangeCalled).toBe(1);
        ReactDOM.unmountComponentAtNode(container);

        onChangeCalled = 0;
        onValueChangeCalled = 0;
        ReactDOM.render(
          <Input onChange={onChange} onValueChange={onValueChange}>
            <input type={type} ref={ref} />
          </Input>,
          container,
        );
        // Should be ignored (no change):
        ref.current.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
        setUntrackedValue.call(ref.current, '42');
        ref.current.dispatchEvent(
          new Event('input', {bubbles: true, cancelable: true}),
        );
        // Should be ignored (no change):
        ref.current.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
        expect(onChangeCalled).toBe(1);
        expect(onValueChangeCalled).toBe(1);
        ReactDOM.unmountComponentAtNode(container);
      });
    });

    it('should listen for both change and input events when supported', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ReactDOM.render(
        <Input onChange={onChange} onValueChange={onValueChange}>
          <input type="range" ref={ref} />
        </Input>,
        container,
      );

      setUntrackedValue.call(ref.current, 10);
      ref.current.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );

      setUntrackedValue.call(ref.current, 20);
      ref.current.dispatchEvent(
        new Event('change', {bubbles: true, cancelable: true}),
      );

      expect(onChangeCalled).toBe(2);
      expect(onValueChangeCalled).toBe(2);
    });

    it('should only fire events when the value changes for range inputs', () => {
      let onChangeCalled = 0;
      let onValueChangeCalled = 0;
      const ref = React.createRef();

      function onChange(e) {
        onChangeCalled++;
        expect(e.type).toBe('change');
      }

      function onValueChange(e) {
        onValueChangeCalled++;
      }

      ReactDOM.render(
        <Input onChange={onChange} onValueChange={onValueChange}>
          <input type="range" ref={ref} />
        </Input>,
        container,
      );
      setUntrackedValue.call(ref.current, '40');
      ref.current.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      ref.current.dispatchEvent(
        new Event('change', {bubbles: true, cancelable: true}),
      );

      setUntrackedValue.call(ref.current, 'foo');
      ref.current.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: true}),
      );
      ref.current.dispatchEvent(
        new Event('change', {bubbles: true, cancelable: true}),
      );

      expect(onChangeCalled).toBe(2);
      expect(onValueChangeCalled).toBe(2);
    });

    it('does not crash for nodes with custom value property', () => {
      let originalCreateElement;
      // https://github.com/facebook/react/issues/10196
      try {
        originalCreateElement = document.createElement;
        document.createElement = function() {
          const node = originalCreateElement.apply(this, arguments);
          Object.defineProperty(node, 'value', {
            get() {},
            set() {},
          });
          return node;
        };
        const ref = React.createRef();
        const div = document.createElement('div');
        // Mount
        ReactDOM.render(
          <Input>
            <input type="text" ref={ref} />
          </Input>,
          div,
        );
        // Update
        ReactDOM.render(
          <Input>
            <input type="text" ref={ref} />
          </Input>,
          div,
        );
        // Change
        ref.current.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: true}),
        );
        // Unmount
        ReactDOM.unmountComponentAtNode(div);
      } finally {
        document.createElement = originalCreateElement;
      }
    });

    describe('concurrent mode', () => {
      it('text input', () => {
        const root = ReactDOM.unstable_createRoot(container);
        let input;

        let ops = [];

        class ControlledInput extends React.Component {
          state = {value: 'initial'};
          onChange = event => this.setState({value: event.target.value});
          render() {
            ops.push(`render: ${this.state.value}`);
            const controlledValue =
              this.state.value === 'changed' ? 'changed [!]' : this.state.value;
            return (
              <Input onChange={this.onChange}>
                <input
                  type="text"
                  ref={el => (input = el)}
                  value={controlledValue}
                />
              </Input>
            );
          }
        }

        // Initial mount. Test that this is async.
        root.render(<ControlledInput />);
        // Should not have flushed yet.
        expect(ops).toEqual([]);
        expect(input).toBe(undefined);
        // Flush callbacks.
        Scheduler.unstable_flushAll();
        expect(ops).toEqual(['render: initial']);
        expect(input.value).toBe('initial');

        ops = [];

        // Trigger a change event.
        setUntrackedValue.call(input, 'changed');
        input.dispatchEvent(
          new Event('input', {bubbles: true, cancelable: true}),
        );
        // Change should synchronously flush
        expect(ops).toEqual(['render: changed']);
        // Value should be the controlled value, not the original one
        expect(input.value).toBe('changed [!]');
      });

      it('checkbox input', () => {
        const root = ReactDOM.unstable_createRoot(container);
        let input;

        let ops = [];

        class ControlledInput extends React.Component {
          state = {checked: false};
          onChange = event => {
            this.setState({checked: event.target.checked});
          };
          render() {
            ops.push(`render: ${this.state.checked}`);
            const controlledValue = this.props.reverse
              ? !this.state.checked
              : this.state.checked;
            return (
              <Input onChange={this.onChange}>
                <input
                  type="checkbox"
                  ref={el => (input = el)}
                  checked={controlledValue}
                />
              </Input>
            );
          }
        }

        // Initial mount. Test that this is async.
        root.render(<ControlledInput reverse={false} />);
        // Should not have flushed yet.
        expect(ops).toEqual([]);
        expect(input).toBe(undefined);
        // Flush callbacks.
        Scheduler.unstable_flushAll();
        expect(ops).toEqual(['render: false']);
        expect(input.checked).toBe(false);

        ops = [];

        // Trigger a change event.
        input.dispatchEvent(
          new MouseEvent('click', {bubbles: true, cancelable: true}),
        );
        // Change should synchronously flush
        expect(ops).toEqual(['render: true']);
        expect(input.checked).toBe(true);

        // Now let's make sure we're using the controlled value.
        root.render(<ControlledInput reverse={true} />);
        Scheduler.unstable_flushAll();

        ops = [];

        // Trigger another change event.
        input.dispatchEvent(
          new MouseEvent('click', {bubbles: true, cancelable: true}),
        );
        // Change should synchronously flush
        expect(ops).toEqual(['render: true']);
        expect(input.checked).toBe(false);
      });

      it('textarea', () => {
        const root = ReactDOM.unstable_createRoot(container);
        let textarea;

        let ops = [];

        class ControlledTextarea extends React.Component {
          state = {value: 'initial'};
          onChange = event => this.setState({value: event.target.value});
          render() {
            ops.push(`render: ${this.state.value}`);
            const controlledValue =
              this.state.value === 'changed' ? 'changed [!]' : this.state.value;
            return (
              <Input onChange={this.onChange}>
                <textarea
                  type="text"
                  ref={el => (textarea = el)}
                  value={controlledValue}
                />
              </Input>
            );
          }
        }

        // Initial mount. Test that this is async.
        root.render(<ControlledTextarea />);
        // Should not have flushed yet.
        expect(ops).toEqual([]);
        expect(textarea).toBe(undefined);
        // Flush callbacks.
        Scheduler.unstable_flushAll();
        expect(ops).toEqual(['render: initial']);
        expect(textarea.value).toBe('initial');

        ops = [];

        // Trigger a change event.
        setUntrackedTextareaValue.call(textarea, 'changed');
        textarea.dispatchEvent(
          new Event('input', {bubbles: true, cancelable: true}),
        );
        // Change should synchronously flush
        expect(ops).toEqual(['render: changed']);
        // Value should be the controlled value, not the original one
        expect(textarea.value).toBe('changed [!]');
      });

      it('is async for non-input events', () => {
        const root = ReactDOM.unstable_createRoot(container);
        let input;

        let ops = [];

        class ControlledInput extends React.Component {
          state = {value: 'initial'};
          onChange = event => this.setState({value: event.target.value});
          reset = () => {
            this.setState({value: ''});
          };
          render() {
            ops.push(`render: ${this.state.value}`);
            const controlledValue =
              this.state.value === 'changed' ? 'changed [!]' : this.state.value;
            return (
              <Press onPress={this.reset}>
                <Input onChange={this.onChange}>
                  <input
                    type="text"
                    ref={el => (input = el)}
                    value={controlledValue}
                  />
                </Input>
              </Press>
            );
          }
        }

        // Initial mount. Test that this is async.
        root.render(<ControlledInput />);
        // Should not have flushed yet.
        expect(ops).toEqual([]);
        expect(input).toBe(undefined);
        // Flush callbacks.
        Scheduler.unstable_flushAll();
        expect(ops).toEqual(['render: initial']);
        expect(input.value).toBe('initial');

        ops = [];

        // Trigger a click event
        input.dispatchEvent(
          new MouseEvent('mousedown', {bubbles: true, cancelable: true}),
        );
        input.dispatchEvent(
          new MouseEvent('mouseup', {bubbles: true, cancelable: true}),
        );
        // Nothing should have changed
        expect(ops).toEqual([]);
        expect(input.value).toBe('initial');

        // Flush callbacks.
        Scheduler.unstable_flushAll();
        // Now the click update has flushed.
        expect(ops).toEqual(['render: ']);
        expect(input.value).toBe('');
      });
    });
  });

  describe('onKeyDown', () => {
    it('should work when pressing key on div', () => {
      const onKeyDown = jest.fn();
      const ref = React.createRef();
      const element = (
        <Input onKeyDown={onKeyDown}>
          <div ref={ref} />
        </Input>
      );
      ReactDOM.render(element, container);
      ref.current.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'a',
        }),
      );
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({key: 'a', type: 'keydown'}),
      );
    });
  });

  describe('onKeyUp', () => {
    it('should work when pressing key on div', () => {
      const onKeyUp = jest.fn();
      const ref = React.createRef();
      const element = (
        <Input onKeyUp={onKeyUp}>
          <div ref={ref} />
        </Input>
      );
      ReactDOM.render(element, container);
      ref.current.dispatchEvent(
        new KeyboardEvent('keyup', {bubbles: true, cancelable: true, key: 'a'}),
      );
      expect(onKeyUp).toHaveBeenCalledTimes(1);
      expect(onKeyUp).toHaveBeenCalledWith(
        expect.objectContaining({key: 'a', type: 'keyup'}),
      );
    });
  });

  describe('onKeyPress', () => {
    it('should work when pressing key on div', () => {
      const onKeyPress = jest.fn();
      const ref = React.createRef();
      const element = (
        <Input onKeyPress={onKeyPress}>
          <div ref={ref} />
        </Input>
      );
      ReactDOM.render(element, container);
      ref.current.dispatchEvent(
        new KeyboardEvent('keypress', {
          bubbles: true,
          cancelable: true,
          key: 'a',
        }),
      );
      expect(onKeyPress).toHaveBeenCalledTimes(1);
      expect(onKeyPress).toHaveBeenCalledWith(
        expect.objectContaining({key: 'a', type: 'keypress'}),
      );
    });
  });

  it('expect displayName to show up for event component', () => {
    expect(Input.responder.displayName).toBe('Input');
  });
});
