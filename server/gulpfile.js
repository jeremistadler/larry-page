var gulp = require('gulp');
var ts = require('gulp-typescript');
var eventStream = require('event-stream');
var connect = require('gulp-connect');
var inject = require('gulp-inject');
var rename = require("gulp-rename");


gulp.task('scripts', ['index'], function() {
    return gulp.src(['scripts/**/*.ts'])
               .pipe(ts({
                   target: 'ES6',
                   noExternalResolve: true
               }))
                .js
                .pipe(gulp.dest('build'));
});

gulp.task('index', function() {
    var sources = gulp.src(['scripts/vendor/*', './build/**/*.js', './build/**/*.css'], { read: false, base: '.' });

    return gulp.src('./index.template.html')
               .pipe(inject(sources))
               .pipe(rename(function(path) {
                   path.basename = "index";
               }))
               .pipe(gulp.dest('.'));
});

gulp.task('watch', function() {
    gulp.watch(['./index.template.html', 'scripts/**/*.ts'], { debounceDelay: 200 }, ['scripts']);
    gulp.watch(['./index.html', 'build/**/*.*'], { debounceDelay: 500 }, ['reload']);
});


gulp.task('reload', function() {
    gulp.src('./index.html')
      .pipe(connect.reload());
});

gulp.task('serve', function() {
    connect.server({
        livereload: true
    });
});

gulp.task('default', ['scripts', 'serve', 'watch', 'index'], function() { });
