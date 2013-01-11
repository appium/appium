var controller = require('./controller');

module.exports = function(rest) {
  rest.get('/wd/hub/status', controller.status);
  rest.post('/wd/hub/session', controller.createSession);
  rest.get('/wd/hub/session/:sessionId?', controller.getSession);
  rest.delete('/wd/hub/session/:sessionId?', controller.deleteSession);
  rest.post('/wd/hub/session/:sessionId?/execute', controller.executeScript);
};
