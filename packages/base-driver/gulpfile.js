
import gulp from 'gulp';
import {boilerplate as setupBoilerplate} from '@appium/gulp-plugins';

const boilerplate = setupBoilerplate.use(gulp);

gulp.task('copy-static', () => gulp.src('./static/*').pipe(gulp.dest('build/static')));

boilerplate({
  build: 'appium-base-driver',
  hybridModule: true,
  postTranspile: ['copy-static']
});
