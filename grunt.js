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
};
