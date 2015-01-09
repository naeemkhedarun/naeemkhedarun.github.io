
var gulp = require('gulp'),
	gulpLoadPlugins = require('gulp-load-plugins'),
	plugins = gulpLoadPlugins();

var files = {
	mainStylesheet : 'stylesheets/main.scss',
    pdfStylesheet : 'stylesheets/pdf.scss',
    stylesheets : 'stylesheets/*.scss'
};

gulp.task('clean',  function(){
	return gulp.src('css')
		.pipe(plugins.clean())
})

gulp.task('sass', ['clean'], function(){
	return gulp.src(files.mainStylesheet)
		.pipe(plugins.sass())
        .on('error', function(error){console.log(error)})
		.pipe(gulp.dest('css'))
})

gulp.task('pdfsass', ['clean'], function(){
	return gulp.src(files.pdfStylesheet)
		.pipe(plugins.sass())
        .pipe(plugins.rename('main.css'))
        .on('error', function(error){console.log(error)})
		.pipe(gulp.dest('css'))
})

gulp.task('pdf', ['pdfsass'], plugins.shell.task([
    'wkhtmltopdf --margin-left 15 --margin-right 15 --zoom 1.0 --viewport-size 1280x1024 http://naeemkhedarun.dev/index.html naeemkhedarun.pdf'
]));

gulp.task('watch', function(){
	gulp.watch(files.stylesheets, ['sass'])
})

