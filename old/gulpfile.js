var gulp = require('gulp');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var size = require('gulp-size');
//var clean = require('gulp-clean');
var rename = require('gulp-rename');
var minifyCSS = require('gulp-minify-css');
var minifyHTML = require('gulp-minify-html');
//var changed = require('gulp-changed');
var compass = require('gulp-compass');
var bowerFiles = require('main-bower-files');
var filter = require('gulp-filter');
var filelog = require('gulp-filelog');
var rev = require('gulp-rev');
var ngHtml2Js = require("gulp-ng-html2js");
var merge = require('merge-stream');
var lazypipe = require('lazypipe');
//var open = require('open');
//var runSequence = require('run-sequence');
//var connect = require('gulp-connect');
var shell = require('gulp-shell');

process.env.GOPATH = process.cwd();

var paths = {
    appjs: {
        src: './src/snow.mspin.net/frontend/scripts/**/*.js',
        dest: './src/snow.mspin.net/frontend/build/'
    },
    libjs: {
        dest: './src/snow.mspin.net/frontend/build/'
    },
    views: {
        src: './src/snow.mspin.net/frontend/views/*.html',
        base: './src/snow.mspin.net/frontend/views/',
        dest: './src/snow.mspin.net/frontend/build/'
    },
    styles: {
        src: './src/snow.mspin.net/frontend/styles/*.scss',
        dest: './src/snow.mspin.net/frontend/build/',
        sass: 'src/snow.mspin.net/frontend/styles/',
        import_path: ['./src/snow.mspin.net/frontend/vendor']
    },
    ae_extra: './src/snow.mspin.net/frontend/',
    ae: {
        modules: [
            './src/snow.mspin.net/frontend/app.yaml',
        ],
    },
};

var options = {
  open: true,
  httpPort: 4400,
  devserver_port: 8080,
  admin_port: 8000
};

// Helper function to generate a pipe that does the common file revisions
function revFiles(name, dest) {
    return lazypipe()
        .pipe(size, {title: name})
        .pipe(rename, { suffix: '.min' })
        .pipe(rev)
        .pipe(gulp.dest, dest)
        .pipe(rev.manifest)
        .pipe(rename, name + "-manifest.json")
        .pipe(gulp.dest, dest);
}

// process the compass files
gulp.task('styles', function () {
    return gulp.src(paths.styles.src)
        .pipe(compass({
            css: paths.styles.dest,
            sass: paths.styles.sass,
            import_path: paths.styles.import_path
        }))
        .pipe(gulp.dest(paths.styles.dest))
        .pipe(minifyCSS())
        .pipe(size({title:"styles"}))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(paths.styles.dest))
        .pipe(rev())
        .pipe(gulp.dest(paths.styles.dest))
        .pipe(rev.manifest())
        .pipe(rename("css-manifest.json"))
        .pipe(gulp.dest(paths.styles.dest));
});

gulp.task('minify-appjs', function () {
    var appjs = gulp.src(paths.appjs.src);
    var viewjs = gulp.src(paths.views.src)
        .pipe(minifyHTML({
            empty: true,
            quotes: true
        }))
        .pipe(ngHtml2Js({
            moduleName: "app",
            stripPrefix: paths.views.base,
            prefix: "/_/views/"
        }));

    return merge(appjs, viewjs)
        .pipe(concat("app.js"))
        .pipe(gulp.dest(paths.appjs.dest))
        .pipe(uglify())
        .pipe(revFiles("appjs", paths.appjs.dest)());
});

gulp.task('minify-libjs', function () {
    return gulp.src(bowerFiles()).pipe(filter([
            '**/*.js',
            '!bootstrap.js',
            '!angular.js',
            '!jquery.js',
        ]))
        //.pipe(filelog())
        .pipe(concat("lib.js"))
        .pipe(gulp.dest(paths.libjs.dest))
        .pipe(uglify())
        .pipe(revFiles("libjs", paths.libjs.dest)());
});

gulp.task('build', ['styles', 'minify-appjs', 'minify-libjs']);

gulp.task('watch', ['build'], function() {
    gulp.watch(paths.styles.src, ['styles']);
    gulp.watch(paths.views.src, ['minify-appjs']);
    gulp.watch(paths.appjs.src, ['minify-appjs']);
    gulp.watch('./bower.json', ['minify-libjs']);
});

gulp.task('server', ['watch'], function(){
    var cfg = [].concat(paths.ae.modules, "./dispatch.yaml");
    gulp.src('').pipe(shell([
        'goapp serve --host=0.0.0.0 --port='+options.devserver_port+' --admin_port='+options.admin_port+' ' + cfg.join(' ')
    ]));
});

gulp.task('deploy', ['build'], function(){
    var appcfg = 'stdbuf -o0 -e0 python2.7 /usr/local/go_appengine/appcfg.py --noauth_local_webserver -A methowsnow ';
    gulp.src('').pipe(shell([
        appcfg + 'update_indexes .',
        appcfg + 'update ' + paths.ae.modules.join(' '),
        appcfg + 'update_dispatch .',
        appcfg + 'update_cron .',
    ], {interactive:true}));
});

gulp.task('vacuum_indexes', [], function(){
    var appcfg = 'stdbuf -o0 -e0 appcfg.py -A methowsnow ';
    gulp.src('').pipe(shell([
        appcfg + 'vacuum_indexes .',
    ],{maxBuffer:1024}));
});

gulp.task('vet', shell.task([
  'go vet `go list snow.mspin.net/... | grep -v third_party`',
],{ignoreErrors:true}));

gulp.task('goget', shell.task([
  'goapp get snow.mspin.net/...',
], {ignoreErrors: true}));

gulp.task('test', shell.task([
  'goapp test -parallel 4  `go list snow.mspin.net/... | grep -v third_party`',
],{ignoreErrors:true}));

gulp.task('install', ['goget'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

// default gulp task
gulp.task('default', ['server'], function() {
});
