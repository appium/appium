var controller = require('./controller');

module.exports = function(app) {
  app.get('/wd/hub/status', controller.status);
};
