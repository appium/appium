var appium = module.exports = function(app, uuid, verbose) {
  this.app = app;
  this.uuid = uuid;
  this.verbose = verbose;
  this.instrumentsProcess = null;
};

appium.prototype.start = function(err, cb) {
  console.log('The appium client start function has been called!');
};
