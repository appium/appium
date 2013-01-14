var server = require('./server.js');

module.exports = function(grunt) {
  grunt.initConfig({
    lint: {
      all: ['*.js', 'app/*.js', 'app/test/unit/*.js', 'instruments/instruments.js', 'instruments/example.js', 'instruments/build.js']
    }
    , jshint: {
      all: {
        options: {
          laxcomma: true
          , es5: true
        }
      }
    }
    , mochaTest: {
      functional: ['test/functional/*.js']
      , unit: ['app/test/unit/*.js']
    }
    , mochaTestConfig: {
      options: {
        timeout: 60000
      }
    }
  });

  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.registerTask('test', 'mochaTest:*');
  grunt.registerTask('functional', 'mochaTest:functional');
  grunt.registerTask('unit', 'mochaTest:unit');
  grunt.registerTask('default', 'lint test');
  grunt.registerTask('appium', "Start the Appium server", function() {
    var done = this.async();
    server.run(
      './sample-code/apps/TestApp/build/Release-iphonesimulator/TestApp.app'
      , null
      , true
      , 4723
      , '127.0.0.1'
      , done
    );
  });
};
