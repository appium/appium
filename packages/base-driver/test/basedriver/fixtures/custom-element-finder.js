module.exports = {
  find: function (driver, logger, selector, multiple) { // eslint-disable-line object-shorthand
    if (!driver || !driver.opts) {
      throw new Error('Expected driver object');
    }

    if (!logger || !logger.info) {
      throw new Error('Expected logger object');
    }

    if (selector === 'foo') {
      return ['bar'];
    }

    if (selector === 'foos') {
      if (multiple) {
        return ['baz1', 'baz2'];
      }

      return ['bar1', 'bar2'];
    }

    if (selector === 'error') {
      throw new Error('This is a plugin error');
    }

    return [];
  }
};
