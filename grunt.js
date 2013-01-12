module.exports = function(grunt) {
  grunt.initConfig({
    lint: {
      all: ['*.js', 'app/*.js', 'instruments/instruments.js', 'instruments/example.js', 'instruments/build.js']
    }
    , jshint: {
      all: {
        options: {
          laxcomma: true
          , es5: true
        }
      }
    }
  });

  grunt.registerTask('default', 'lint');
};
