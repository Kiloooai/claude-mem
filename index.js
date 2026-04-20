const { Store } = require('./lib/store');
const { logSession, shouldInject } = require('./lib/injector');

module.exports = { Store, logSession, shouldInject };
