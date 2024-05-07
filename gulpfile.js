
var gulp = require('gulp');
const gulpSass = require('gulp-sass')(require('sass'));
const del = require('del');
const rename = require('gulp-rename');
const shell = require('gulp-shell');
const spawn = require('gulp-spawn');
const connect = require('gulp-connect');

var files = {
	mainStylesheet : 'stylesheets/main.scss',
    pdfStylesheet : 'stylesheets/pdf.scss',
    stylesheets : 'stylesheets/*.scss'
};

function clean(){
	return del('css')
}

function sass(){
	return gulp.src(files.mainStylesheet)
			.pipe(gulpSass().on('error', gulpSass.logError))
			.on('error', function(error){console.log(error)})
			.pipe(gulp.dest('css'))
}

function pdfSass(){
	return gulp.src(files.pdfStylesheet)
		.pipe(gulpSass())
        .pipe(rename('main.css'))
        .on('error', function (error) {
            console.error(error.toString());
            this.emit('end');
        })
		.pipe(gulp.dest('css'))
        .pipe(connect.reload());
}

function pdf(){
	return gulp.src(files.pdfStylesheet)
	.pipe(spawn({
		cmd: "wkhtmltopdf",
		args: ["--margin-left", "15", "--margin-right", "15", "--zoom", "1.0", "--viewport-size", "1280x1024", "http://localhost:8080/index.html", "naeemkhedarun.pdf"]
	}))
}


function server() {
    connect.server({
        livereload: true 
    });
}

exports.server = server;
exports.pdf = gulp.series(pdf);
exports.sass = gulp.series(clean, sass);
exports.pdfsass = gulp.series(clean, pdfSass);

exports.clean = clean;