"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=List;var _jsxRuntime=require("react/jsx-runtime"),React=_interopRequireWildcard(require("react"));function _getRequireWildcardCache(){if("function"!=typeof WeakMap)return null;var a=new WeakMap;return _getRequireWildcardCache=function(){return a},a}function _interopRequireWildcard(a){if(a&&a.__esModule)return a;if(null===a||"object"!=typeof a&&"function"!=typeof a)return{default:a};var b=_getRequireWildcardCache();if(b&&b.has(a))return b.get(a);var c={},d=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var e in a)if(Object.prototype.hasOwnProperty.call(a,e)){var f=d?Object.getOwnPropertyDescriptor(a,e):null;f&&(f.get||f.set)?Object.defineProperty(c,e,f):c[e]=a[e]}return c.default=a,b&&b.set(a,c),c}/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */function ListItem({item:a,removeItem:b,toggleItem:c}){const d=(0,React.useCallback)(()=>{b(a)},[a,b]),e=(0,React.useCallback)(()=>{c(a)},[a,c]);return/*#__PURE__*/(0,_jsxRuntime.jsxs)("li",{children:[/*#__PURE__*/(0,_jsxRuntime.jsx)("button",{onClick:d,children:"Delete"}),/*#__PURE__*/(0,_jsxRuntime.jsxs)("label",{children:[/*#__PURE__*/(0,_jsxRuntime.jsx)("input",{checked:a.isComplete,onChange:e,type:"checkbox"})," ",a.text]})]})}function List(){const[a,b]=(0,React.useState)(""),[c,d]=(0,React.useState)([{id:1,isComplete:!0,text:"First"},{id:2,isComplete:!0,text:"Second"},{id:3,isComplete:!1,text:"Third"}]),[e,f]=(0,React.useState)(4),g=(0,React.useCallback)(()=>{""!==a&&(d([...c,{id:e,isComplete:!1,text:a}]),f(e+1),b(""))},[a,c,e]),h=(0,React.useCallback)(a=>{"Enter"===a.key&&g()},[g]),i=(0,React.useCallback)(a=>{b(a.currentTarget.value)},[b]),j=(0,React.useCallback)(a=>d(c.filter(b=>b!==a)),[c]),k=(0,React.useCallback)(a=>{// Dont use indexOf()
// because editing props in DevTools creates a new Object.
const b=c.findIndex(b=>b.id===a.id);d(c.slice(0,b).concat({...a,isComplete:!a.isComplete}).concat(c.slice(b+1)))},[c]);return/*#__PURE__*/(0,_jsxRuntime.jsxs)(React.Fragment,{children:[/*#__PURE__*/(0,_jsxRuntime.jsx)("h1",{children:"List"}),/*#__PURE__*/(0,_jsxRuntime.jsx)("input",{type:"text",placeholder:"New list item...",value:a,onChange:i,onKeyPress:h}),/*#__PURE__*/(0,_jsxRuntime.jsx)("button",{disabled:""===a,onClick:g,children:/*#__PURE__*/(0,_jsxRuntime.jsx)("span",{role:"img","aria-label":"Add item",children:"Add"})}),/*#__PURE__*/(0,_jsxRuntime.jsx)("ul",{children:c.map(a=>/*#__PURE__*/(0,_jsxRuntime.jsx)(ListItem,{item:a,removeItem:j,toggleItem:k},a.id))})]})}
//# sourceMappingURL=ToDoList.js.map
//# sourceURL=ToDoList.js