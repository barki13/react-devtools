
require('babel-core/register');
require('./globals.js');

var Backend = require('../../backend/Backend');
var Bridge = require('../../backend/Bridge');

var inject = require('../../backend/inject');

// TODO: check to see if we're in RN before doing this?
setInterval(function () {
  console.log('tick');
  // this is needed to force refresh on react native
}, 100);

var hasStarted = false;

function setup(socket) {
  var wall = {
    listen: function(fn) {
      socket.on('message', fn);
    },
    send: function(data) {
      socket.sendMessage(data);
    },
    disconnect: function() {
      socket.close();
    },
  };

  socket.on('close', function () {
    backend.reactInternals.removeDevtools();
    hasStarted = false;
    bridge = null;
    backend = null;
    console.log('closing');
  });

  var bridge = new Bridge();
  bridge.attach(wall);
  var backend = new Backend(window);
  backend.addBridge(bridge);

  bridge.onCall('rn:getStyle', id => {
    var node = backend.nodes.get(id);
    if (!node) {
      return null;
    }
    var style = node.props.style;
    return window.__REACT_DEVTOOLS_BACKEND__.resolveRNStyle(style);
  });
  bridge.on('rn:setStyle', ({id, attr, val}) => {
    console.log('setting rn style', id, attr, val);
    var comp = backend.comps.get(id);
    comp.getPublicInstance().setNativeProps({[attr]: val});
  });

  var _connectTimeout = setTimeout(function () {
    console.error('react-devtools backend got no connection');
  }, 20000);

  backend.once('connected', function () {
    hasStarted = true;
    inject(window, backend);
    clearTimeout(_connectTimeout);
  });
}

var JsonSocket = require('json-socket');
var net = require('net')

var server = new net.Server();
server.listen(8011, '0.0.0.0');

server.on('connection', function (socket) {
  console.log('server connection');
  if (hasStarted) {
    console.warn('already connected');
    return socket.close();
  }
  setup(new JsonSocket(socket));
});
