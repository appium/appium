var controller = require('./controller');

module.exports = function(app) {
  app.get('/wd/hub/status', controller.status);
  app.post('/wd/hub/session', controller.createSession);
  app.get('/wd/hub/session/:sessionId?', controller.getSession);
  app.delete('/wd/hub/session/:sessionId?', controller.deleteSession);
  app.post('/wd/hub/session/:sessionId?/execute', controller.executeScript);
};
