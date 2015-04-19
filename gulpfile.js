var gulp = require('gulp');
var ts = require('gulp-typescript');
var eventStream = require('event-stream');
var connect = require('gulp-connect');
var inject = require('gulp-inject');

gulp.task('scripts', ['index'], function() {
    gulp.src(['app.css', './*.jpg'])
        .pipe(gulp.dest('build'));

    return gulp.src(['references.ts', 'app.ts', 'Q.d.ts', 'src/**/*.ts'])
               .pipe(ts({
                   target: 'ES6',
                   noExternalResolve: true
               }))
                .js
                .pipe(gulp.dest('build'));
});

gulp.task('index', function() {
    var sources = gulp.src(['./build/**/*.js', './build/**/*.css'], { read: false, base: '.' });

    return gulp.src('./index.html')
               .pipe(inject(sources, { ignorePath: '/build', addRootSlash: false }))
               .pipe(gulp.dest('./build'));
});

gulp.task('watch', function() {
    gulp.watch(['app.ts', 'app.css', 'index.html', 'src/**/*.ts'], { debounceDelay: 200 }, ['scripts']);
    gulp.watch(['build/**/*.*'], { debounceDelay: 500 }, ['reload']);
});


gulp.task('reload', function() {
    gulp.src('build/index.html')
      .pipe(connect.reload());
});

gulp.task('serve', function() {
    connect.server({
        root: 'build',
        livereload: true
    });
});

gulp.task('default', ['scripts', 'serve', 'watch', 'index'], function() { });