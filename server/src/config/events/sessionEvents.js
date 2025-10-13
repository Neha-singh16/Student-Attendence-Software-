const EventEmitter = require('events');

class SessionEmitter extends EventEmitter {}

const sessionEmitter = new SessionEmitter();

module.exports = sessionEmitter;
