'use strict';

const register = require('react-transport-dom-webpack/node-register');
register();

const babelRegister = require('@babel/register');

babelRegister({
  ignore: [/\/(build|node_modules)\//],
  presets: ['react-app'],
  plugins: ['@babel/transform-modules-commonjs'],
});

const express = require('express');
const app = express();

// Application
app.get('/', function(req, res) {
  if (process.env.NODE_ENV === 'development') {
    for (var key in require.cache) {
      delete require.cache[key];
    }
  }
  import('./handler.server.mjs').then(m => m.default(req, res));
  // require('./handler.server.js')(req, res);
});

app.listen(3001, () => {
  console.log('Flight Server listening on port 3001...');
});

app.on('error', function(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});
