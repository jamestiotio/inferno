/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

import React from 'inferno-compat';
import { createComponentVNode } from 'inferno';
import { Wrapper } from 'inferno-test-utils';
import { VNodeFlags } from 'inferno-vnode-flags';

var ReactDOM = React;

var clone = function (o) {
  return JSON.parse(JSON.stringify(o));
};

var GET_INIT_STATE_RETURN_VAL = {
  hasWillMountCompleted: false,
  hasRenderCompleted: false,
  hasDidMountCompleted: false,
  hasWillUnmountCompleted: false
};

var INIT_RENDER_STATE = {
  hasWillMountCompleted: true,
  hasRenderCompleted: false,
  hasDidMountCompleted: false,
  hasWillUnmountCompleted: false
};

var DID_MOUNT_STATE = {
  hasWillMountCompleted: true,
  hasRenderCompleted: true,
  hasDidMountCompleted: false,
  hasWillUnmountCompleted: false
};

var NEXT_RENDER_STATE = {
  hasWillMountCompleted: true,
  hasRenderCompleted: true,
  hasDidMountCompleted: true,
  hasWillUnmountCompleted: false
};

var WILL_UNMOUNT_STATE = {
  hasWillMountCompleted: true,
  hasDidMountCompleted: true,
  hasRenderCompleted: true,
  hasWillUnmountCompleted: false
};

var POST_WILL_UNMOUNT_STATE = {
  hasWillMountCompleted: true,
  hasDidMountCompleted: true,
  hasRenderCompleted: true,
  hasWillUnmountCompleted: true
};

/**
 * Every React component is in one of these life cycles.
 */
var ComponentLifeCycle = {
  /**
   * Mounted components have a DOM node representation and are capable of
   * receiving new props.
   */
  MOUNTED: 'MOUNTED',
  /**
   * Unmounted components are inactive and cannot receive new props.
   */
  UNMOUNTED: 'UNMOUNTED'
};

/**
 * TODO: We should make any setState calls fail in
 * `getInitialState` and `componentWillMount`. They will usually fail
 * anyways because `this._renderedComponent` is empty, however, if a component
 * is *reused*, then that won't be the case and things will appear to work in
 * some cases. Better to just block all updates in initialization.
 */
describe('ReactComponentLifeCycle', function () {
  let container;

  function renderIntoDocument(input) {
    return React.render(createComponentVNode(VNodeFlags.ComponentClass, Wrapper, { children: input }), container);
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    React.render(null, container);
    container.innerHTML = '';
    document.body.removeChild(container);
  });

  it('should not reuse an instance when it has been unmounted', function () {
    var container = document.createElement('div');
    class StatefulComponent extends React.Component {
      getInitialState() {
        return {};
      }
      render() {
        return <div />;
      }
    }
    var element = <StatefulComponent />;

    var firstInstance = ReactDOM.render(element, container);
    ReactDOM.unmountComponentAtNode(container);
    var secondInstance = ReactDOM.render(element, container);
    expect(firstInstance).not.toBe(secondInstance);
  });

  /**
   * If a state update triggers rerendering that in turn fires an onDOMReady,
   * that second onDOMReady should not fail.
   */
  it('it should fire onDOMReady when already in onDOMReady', function (done) {
    var _testJournal = [];

    class Child extends React.Component {
      componentDidMount() {
        _testJournal.push('Child:onDOMReady');
      }
      render() {
        return <div />;
      }
    }

    class SwitcherParent extends React.Component {
      getInitialState() {
        _testJournal.push('SwitcherParent:getInitialState');
        return { showHasOnDOMReadyComponent: false };
      }
      componentDidMount() {
        _testJournal.push('SwitcherParent:onDOMReady');
        this.switchIt();
      }
      switchIt() {
        this.setState({ showHasOnDOMReadyComponent: true });
      }
      render() {
        return <div>{this.state.showHasOnDOMReadyComponent ? <Child /> : <div> </div>}</div>;
      }
    }

    var instance = <SwitcherParent />;
    renderIntoDocument(instance);
    setTimeout(() => {
      expect(_testJournal).toEqual(['SwitcherParent:getInitialState', 'SwitcherParent:onDOMReady', 'Child:onDOMReady']);
      done();
    }, 20);
  });

  // You could assign state here, but not access members of it, unless you
  // had provided a getInitialState method.
  // it('throws when accessing state in componentWillMount', function() {
  //   var StatefulComponent = React.createClass({
  //     componentWillMount: function() {
  //       void this.state.yada;
  //     },
  //     render: function() {
  //       return (
  //         <div></div>
  //       );
  //     },
  //   });
  //   var instance = <StatefulComponent />;
  //   expect(function() {
  //     instance = ReactTestUtils.renderIntoDocument(instance);
  //   }).toThrow();
  // });

  it('should allow update state inside of componentWillMount', function () {
    class StatefulComponent extends React.Component {
      componentWillMount() {
        this.setState({ stateField: 'something' });
      }

      render() {
        return <div />;
      }
    }

    var instance = <StatefulComponent />;
    expect(function () {
      renderIntoDocument(instance);
    }).not.toThrow();
  });

  it('should not allow update state inside of getInitialState', function () {
    spyOn(console, 'error');
    class StatefulComponent extends React.Component {
      getInitialState() {
        this.setState({ stateField: 'something' });

        return { stateField: 'somethingelse' };
      }
      render() {
        return <div />;
      }
    }

    expect(() => renderIntoDocument(<StatefulComponent />)).toThrow();
    // expect(console.error.calls.count()).toBe(1);
    // expect(console.error.argsForCall[0][0]).toBe(
    //   'Warning: setState(...): Can only update a mounted or ' +
    //   'mounting component. This usually means you called setState() on an ' +
    //   'unmounted component. This is a no-op. Please check the code for the ' +
    //   'StatefulComponent component.'
    // );
  });

  it('should correctly determine if a component is mounted', function () {
    spyOn(console, 'error');
    class Component extends React.Component {
      componentWillMount() {
        expect(this.isMounted()).toBeFalsy();
      }
      componentDidMount() {
        expect(this.isMounted()).toBeTruthy();
      }
      render() {
        expect(this.isMounted()).toBeFalsy();
        return <div />;
      }
    }

    var element = <Component />;

    var instance = renderIntoDocument(element);
    expect(instance.$LI.children.isMounted()).toBeTruthy();

    // expect(console.error.calls.count()).toBe(1);
    // expect(console.error.argsForCall[0][0]).toContain(
    //   'Component is accessing isMounted inside its render()'
    // );
  });

  it('should correctly determine if a null component is mounted', function () {
    spyOn(console, 'error');
    class Component extends React.Component {
      componentWillMount() {
        expect(this.isMounted()).toBeFalsy();
      }
      componentDidMount() {
        expect(this.isMounted()).toBeTruthy();
      }
      render() {
        expect(this.isMounted()).toBeFalsy();
        return null;
      }
    }

    var element = <Component />;

    var instance = renderIntoDocument(element);
    expect(instance.$LI.children.isMounted()).toBeTruthy();

    // expect(console.error.calls.count()).toBe(1);
    // expect(console.error.argsForCall[0][0]).toContain(
    //   'Component is accessing isMounted inside its render()'
    // );
  });

  it('isMounted should return false when unmounted', function () {
    class Component extends React.Component {
      render() {
        return <div />;
      }
    }

    var container = document.createElement('div');
    var instance = ReactDOM.render(<Component />, container);

    expect(instance.isMounted()).toBe(true);

    ReactDOM.unmountComponentAtNode(container);

    expect(instance.isMounted()).toBe(false);
  });

  //   // A component that is merely "constructed" (as in "constructor") but not
  //   // yet initialized, or rendered.
  //   //
  //   var container = document.createElement('div');
  //   var instance = ReactDOM.render(<LifeCycleComponent />, container);

  //   // getInitialState
  //   expect(instance._testJournal.returnedFromGetInitialState).toEqual(
  //     GET_INIT_STATE_RETURN_VAL
  //   );
  //   expect(instance._testJournal.lifeCycleAtStartOfGetInitialState)
  //     .toBe(ComponentLifeCycle.UNMOUNTED);

  //   // componentWillMount
  //   expect(instance._testJournal.stateAtStartOfWillMount).toEqual(
  //     instance._testJournal.returnedFromGetInitialState
  //   );
  //   expect(instance._testJournal.lifeCycleAtStartOfWillMount)
  //     .toBe(ComponentLifeCycle.MOUNTED);

  //   // componentDidMount
  //   expect(instance._testJournal.stateAtStartOfDidMount)
  //     .toEqual(DID_MOUNT_STATE);
  //   expect(instance._testJournal.lifeCycleAtStartOfDidMount).toBe(
  //     ComponentLifeCycle.MOUNTED
  //   );

  //   // render
  //   expect(instance._testJournal.stateInInitialRender)
  //     .toEqual(INIT_RENDER_STATE);
  //   expect(instance._testJournal.lifeCycleInInitialRender).toBe(
  //     ComponentLifeCycle.MOUNTED
  //   );

  //   expect(getLifeCycleState(instance)).toBe(ComponentLifeCycle.MOUNTED);

  //   // Now *update the component*
  //   instance.forceUpdate();

  //   // render 2nd time
  //   expect(instance._testJournal.stateInLaterRender)
  //     .toEqual(NEXT_RENDER_STATE);
  //   expect(instance._testJournal.lifeCycleInLaterRender).toBe(
  //     ComponentLifeCycle.MOUNTED
  //     ComponentLifeCycle.MOUNTED
  //   );

  //   expect(getLifeCycleState(instance)).toBe(ComponentLifeCycle.MOUNTED);

  //   ReactDOM.unmountComponentAtNode(container);

  //   expect(instance._testJournal.stateAtStartOfWillUnmount)
  //     .toEqual(WILL_UNMOUNT_STATE);
  //   // componentWillUnmount called right before unmount.
  //   expect(instance._testJournal.lifeCycleAtStartOfWillUnmount).toBe(
  //     ComponentLifeCycle.MOUNTED
  //   );

  //   // But the current lifecycle of the component is unmounted.
  //   expect(getLifeCycleState(instance)).toBe(ComponentLifeCycle.UNMOUNTED);
  //   expect(instance.state).toEqual(POST_WILL_UNMOUNT_STATE);
  // });

  // it('should throw when calling setProps() on an owned component', function() {
  //   /**
  //    * calls setProps in an componentDidMount.
  //    */
  //   var Inner = React.createClass({
  //     render: function() {
  //       return <div />;
  //     },
  //   });
  //   var PropsUpdaterInOnDOMReady = React.createClass({
  //     componentDidMount: function() {
  //       this.refs.theSimpleComponent.setProps({
  //         className: this.props.valueToUseInOnDOMReady,
  //       });
  //     },
  //     render: function() {
  //       return (
  //         <Inner
  //           className={this.props.valueToUseInitially}
  //           ref="theSimpleComponent"
  //         />
  //       );
  //     },
  //   });
  //   var instance =
  //     <PropsUpdaterInOnDOMReady
  //       valueToUseInitially="hello"
  //       valueToUseInOnDOMReady="goodbye"
  //     />;
  //   spyOn(console, 'error');
  //   expect(function() {
  //     instance = ReactTestUtils.renderIntoDocument(instance);
  //   }).toThrow(
  //     'Invariant Violation: setProps(...): You called `setProps` on a ' +
  //     'component with a parent. This is an anti-pattern since props will get ' +
  //     'reactively updated when rendered. Instead, change the owner\'s ' +
  //     '`render` method to pass the correct value as props to the component ' +
  //     'where it is created.'
  //   );
  //   expect(console.error.calls.count()).toBe(1);  // setProps deprecated
  // });

  it('should not throw when updating an auxiliary component', function () {
    class Tooltip extends React.Component {
      render() {
        return <div>{this.props.children}</div>;
      }
      componentDidMount() {
        this.container = document.createElement('div');
        this.updateTooltip();
      }
      componentDidUpdate() {
        this.updateTooltip();
      }
      updateTooltip() {
        // Even though this.props.tooltip has an owner, updating it shouldn't
        // throw here because it's mounted as a root component
        ReactDOM.render(this.props.tooltip, this.container);
      }
    }

    class Component extends React.Component {
      render() {
        return <Tooltip tooltip={<div>{this.props.tooltipText}</div>}>{this.props.text}</Tooltip>;
      }
    }

    var container = document.createElement('div');
    ReactDOM.render(<Component text="uno" tooltipText="one" />, container);

    // Since `instance` is a root component, we can set its props. This also
    // makes Tooltip rerender the tooltip component, which shouldn't throw.
    ReactDOM.render(<Component text="dos" tooltipText="two" />, container);
  });

  it('should allow state updates in componentDidMount', function (done) {
    /**
     * calls setState in an componentDidMount.
     */
    class SetStateInComponentDidMount extends React.Component {
      getInitialState() {
        return {
          stateField: this.props.valueToUseInitially
        };
      }
      componentDidMount() {
        this.setState({ stateField: this.props.valueToUseInOnDOMReady });
      }
      render() {
        return <div />;
      }
    }

    var instance = <SetStateInComponentDidMount valueToUseInitially="hello" valueToUseInOnDOMReady="goodbye" />;
    instance = renderIntoDocument(instance);

    setTimeout(() => {
      expect(instance.$LI.children.state.stateField).toBe('goodbye');
      done();
    }, 25);
  });

  it('should call nested lifecycle methods in the right order', function () {
    var log;
    var logger = function (msg) {
      return function () {
        // return true for shouldComponentUpdate
        log.push(msg);
        return true;
      };
    };
    class Outer extends React.Component {
      render() {
        return (
          <div>
            <Inner x={this.props.x} />
          </div>
        );
      }
      componentWillMount() {
       log.push('outer componentWillMount');
      }
      componentDidMount() {
        log.push('outer componentDidMount');
      }
      componentWillReceiveProps() {
        log.push('outer componentWillReceiveProps')
      }
      shouldComponentUpdate() {
        log.push('outer shouldComponentUpdate')

        return true;
      }
      componentWillUpdate() {
        log.push('outer componentWillUpdate')
      }
      componentDidUpdate() {
        log.push('outer componentDidUpdate')
      }
      componentWillUnmount() {
        log.push('outer componentWillUnmount')
      }
    }

    class Inner extends React.Component {
      render() {
        return <span>{this.props.x}</span>;
      }
      componentWillMount() {
        log.push('inner componentWillMount');
      }
      componentDidMount() {
        log.push('inner componentDidMount');
      }
      componentWillReceiveProps() {
        log.push('inner componentWillReceiveProps')
      }
      shouldComponentUpdate() {
        log.push('inner shouldComponentUpdate')

        return true;
      }
      componentWillUpdate() {
        log.push('inner componentWillUpdate')
      }
      componentDidUpdate() {
        log.push('inner componentDidUpdate')
      }
      componentWillUnmount() {
        log.push('inner componentWillUnmount')
      }
    }

    var container = document.createElement('div');
    log = [];
    ReactDOM.render(<Outer x={17} />, container);
    expect(log).toEqual(['outer componentWillMount', 'inner componentWillMount', 'inner componentDidMount', 'outer componentDidMount']);

    log = [];
    ReactDOM.render(<Outer x={42} />, container);
    expect(log).toEqual([
      'outer componentWillReceiveProps',
      'outer shouldComponentUpdate',
      'outer componentWillUpdate',
      'inner componentWillReceiveProps',
      'inner shouldComponentUpdate',
      'inner componentWillUpdate',
      'inner componentDidUpdate',
      'outer componentDidUpdate'
    ]);

    log = [];
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['outer componentWillUnmount', 'inner componentWillUnmount']);
  });
});
