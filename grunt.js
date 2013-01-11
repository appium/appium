module.exports = function(grunt) {
  grunt.initConfig({
    lint: {
      all: ['*.js', 'app/*.js']
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
