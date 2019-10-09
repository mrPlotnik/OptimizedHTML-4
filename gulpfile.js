'use strict';

var syntax        = 'sass', // Syntax: sass or scss
		gulpversion   = '4'; // Gulp version: 3 or 4

let isDev = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

const 
		gulp          = require('gulp'),
		plumber 			= require('gulp-plumber'),

		pug 					= require('gulp-pug'),

		browserSync   = require('browser-sync'),
		reload				= browserSync.reload,

		sourceMaps 		= require('gulp-sourcemaps'),

		sass          = require('gulp-sass'),
		cssToScss 		= require('gulp-css-scss'),

		autoprefixer  = require('gulp-autoprefixer'),
		csso 					= require('gulp-csso'),

		concat        = require('gulp-concat'),
		uglify        = require('gulp-uglify'),	
		imagemin 			= require('gulp-imagemin'),
		
		ftp 					= require('vinyl-ftp'),

		del         	= require('del'),	
		notify        = require('gulp-notify'),
		gulpIf 				= require('gulp-if'),		
		gutil         = require('gulp-util');				

//-------------------------------------------
// https://habr.com/ru/post/259225/
// Gulp.watch: ловим ошибки правильно
//-------------------------------------------
function wrapPipe(taskFn) {
  return function(done) {
    var onSuccess = function() {
      done();
    };
    var onError = function(err) {
      done(err);
    }
    var outStream = taskFn(onSuccess, onError);
    if(outStream && typeof outStream.on === 'function') {
      outStream.on('end', onSuccess);
    }
  }
}

//-------------------------------------------
// Компиляция PUG в HTML
//-------------------------------------------
gulp.task('pug', () => {
	return gulp.src('app/pug/index.pug')
	.pipe(plumber())
	.pipe(pug({pretty: true}))
	.pipe(gulp.dest('dist/'))   
	.pipe(reload({stream: true}))	
});

//-------------------------------------------
// Сборка стилей
//-------------------------------------------
gulp.task('sass', () => {	
	return gulp.src('app/sass/main.sass')		
		.pipe(gulpIf(isDev, sourceMaps.init()))
		.pipe(plumber())
		.pipe(sass({
			outputStyle: 'expanded', 
			includePaths: require('node-bourbon').includePaths
		}))
		.pipe(gulpIf(isDev, sourceMaps.write()))    
		.pipe(gulpIf(!isDev, autoprefixer(['last 15 versions']))) 
		.pipe(gulpIf(!isDev, csso()))
		.pipe(gulp.dest('dist/css'))
		.pipe(browserSync.stream())
});

//-------------------------------------------
// Сборка js
//-------------------------------------------
gulp.task('js', () => {
	return gulp.src([
		'app/libs/jquery/dist/jquery.min.js',
		'app/js/common.js', // Always at the end
		])
		.pipe(gulpIf(isDev, sourceMaps.init()))
		.pipe(concat('scripts.min.js'))
		.pipe(gulpIf(isDev, sourceMaps.write())) 
		.pipe(gulpIf(!isDev, uglify()))
		.pipe(gulp.dest('dist/js'))
		.pipe(reload({stream: true}))
});

//-------------------------------------------
// Копируем php
//-------------------------------------------
gulp.task('php', () => {	
	return gulp.src('app/php/*.php')		
		.pipe(gulp.dest('dist/php/'));
});	

//----------------------------------------------
// Оптимизация, минификация изображений
//----------------------------------------------
gulp.task('imagemin', () =>
	gulp.src('app/img/**/*')
		.pipe(gulpIf(!isDev, imagemin({
			optimizationLevel: 7,
			progressive: true,
			interlaced: true
			// svgoPlugins: [
			// 	{removeUnknownsAndDefaults: false},
			// 	{cleanupIDs: false},
			// 	{removeViewBox: false}
			// ]
		}))
		.pipe(gulp.dest('dist/img'))
));

//---------------------------------------------
// Browser-sync
//---------------------------------------------
gulp.task('browser-sync', () => {
	browserSync({
		server: {baseDir: 'dist'},
		notify: false,
		// open: false,
		// online: false, // Work Offline Without Internet Connection
		// tunnel: true, tunnel: "projectname", // Demonstration page: http://projectname.localtunnel.me
	})
});

//---------------------------------------------
// Vynil-FTP. Деплой на сервер
//---------------------------------------------
gulp.task( 'deploy', () => {

	var conn = ftp.create( {
		host:     'files.000webhost.com',
		port:     '21',
		user:     'plotnik-webdev',
		password: 'm1Id%AMHojwximHcy^df', // Do not forget to delete
		parallel: 5,
		// maxConnections: 3,
		log:      gutil.log
	});

	var globs = [ 'dist/**' ];

	return gulp.src( globs, { base: 'dist', buffer: false } )
		// .pipe( conn.newer( 'public_html/' ) ) // only upload newer files
		.pipe( conn.dest( 'public_html/fitness' ) );
	});  

//-------------------------------------------
// Копируем шрифты
//-------------------------------------------
gulp.task('copyFont', () => {
	return gulp.src('app/fonts/*')		
	.pipe(gulp.dest('dist/fonts'));
});

//-------------------------------------------
// Компилируем CSS в SCSS
//-------------------------------------------		
gulp.task('cssToScss', () => {
	return gulp.src([				
		'app/libs/animate.css/animate.min.css',
		'app/libs/magnific-popup/dist/magnific-popup.css'
		])
	.pipe(cssToScss())
	.pipe(gulp.dest('app/libs/cssToScss'));
});	

//----------------------------------------------
// Наблюдаем за изменениями, компилируем, перезагружаем
//----------------------------------------------
gulp.task('watch', gulp.parallel('pug', 'sass', 'js', 'php', 'imagemin', 'browser-sync', () => {
	gulp.watch('app/pug/**/*.pug',  gulp.series('pug'));
	gulp.watch('app/sass/*.sass',  gulp.series('sass'));
	gulp.watch('app/js/*.js',  gulp.series('js'));
	gulp.watch('app/*.php',  gulp.series('php'));
}));	

//-------------------------------------------	
// Скопировать шрифты в директорию dist,
// преобразовать CSS в SCSS
//-------------------------------------------	
gulp.task('beforeTheStart', gulp.series('cssToScss', 'copyFont', 'watch'), () => {
	console.log('');
});

//----------------------------------------------
// Очистка директории
//----------------------------------------------
gulp.task('removedist', () => {
	return del.sync('dist/*'); 
});

//----------------------------------------------
// По умолчанию (при запуске)
//----------------------------------------------
gulp.task('default', gulp.parallel('removedist','beforeTheStart'));