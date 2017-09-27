'use strict';

// Global
const gulp = require('gulp');
const projectConfig = require('./projectConfig.json');
const dirs = projectConfig.directories;
const lists = getFilesList(projectConfig);
// console.log(lists);

const gulpSequence = require('gulp-sequence');
const browserSync = require('browser-sync').create();
const gulpIf = require('gulp-if');
const debug = require('gulp-debug');
const del = require('del');
const plumber = require('gulp-plumber');
const fileinclude = require('gulp-file-include');
const size = require('gulp-size');
const rename = require('gulp-rename');
const notify = require('gulp-notify');
const fs = require('fs');
const newer = require('gulp-newer');
const replace = require('gulp-replace');
const rigger = require('gulp-rigger');
const wait = require('gulp-wait');

// Less
const less = require('gulp-less');
const sourcemaps = require('gulp-sourcemaps');
const cleanss = require('gulp-cleancss');

// Post Css
const postcss = require('gulp-postcss');
const autoprefixer = require("autoprefixer");
const mqpacker = require("css-mqpacker");
const objectFitImages = require('postcss-object-fit-images');
const inlineSVG = require('postcss-inline-svg');
const sorting = require('postcss-sorting');
const perfectionist = require('perfectionist');

// Svg Sprite
const svgstore = require('gulp-svgstore');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');

// Png Sprite
const spritesmith = require('gulp.spritesmith');
const buffer = require('vinyl-buffer');
const merge = require('merge-stream');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');

// Javascript
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');

// NODE_ENV=production gulp
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

const sortingOptions = require('./sortingOptions.json');

let postCssPlugins = [
  autoprefixer({browsers: ['last 4 versions', '> 1%', 'Firefox ESR']}),
  inlineSVG(),
  objectFitImages(),
  sorting(sortingOptions),
  mqpacker({
    sort: true
  }),
  perfectionist({
    indentSize: 2,
  })
];

function reload (done) {
  browserSync.reload();
  done();
}

let onError = function(err) {
    notify.onError({
      title: 'Error in ' + err.plugin,
    })(err);
    this.emit('end');
};

function fileExist(path) {
  const fs = require('fs');
  try {
    fs.statSync(path);
  } catch(err) {
    return !(err && err.code === 'ENOENT');
  }
}



let styleImports = '/*!*\n * ВНИМАНИЕ! Этот файл генерируется автоматически.\n * Не пишите сюда ничего вручную, все такие правки будут потеряны.\n */\n\n';
lists.css.forEach(function(blockPath) {
  styleImports += '@import \''+blockPath+'\';\n';
});
fs.writeFileSync(dirs.source + 'less/style.less', styleImports);



// Clean
gulp.task('clean', function () {
  return del(dirs.build + '/**/*')
});



// Html
gulp.task('html', function() {
  return gulp.src(dirs.source + '/*.html')
    .pipe(plumber({
      errorHandler: function(err) {
        notify.onError({
          title: 'HTML compilation error',
          message: err.message
        })(err);
        this.emit('end');
      }
    }))
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file',
      indent: true,
    }))
    .pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, ''))
    .pipe(gulp.dest(dirs.build));
});



// less
gulp.task('style', function () {
  return gulp.src(dirs.source + '/less/style.less')
    .pipe(plumber({
      errorHandler: function(err) {
        notify.onError({
          title: 'less compilation error',
          message: err.message
        })(err);
        this.emit('end');
      }
    }))
    .pipe(wait(100))
    .pipe(gulpIf(isDevelopment, sourcemaps.init()))
    .pipe(debug({title: "less:"}))
    .pipe(less())
    .pipe(postcss(postCssPlugins))
    .pipe(gulpIf(!isDevelopment, cleanss()))
    .pipe(rename('style.min.css'))
    .pipe(gulpIf(isDevelopment, sourcemaps.write('/')))
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.build + '/css'))
    .pipe(browserSync.stream({match: '**/*.css'}));
});



// Css Copying
gulp.task('copy:css', function () {
  return gulp.src(dirs.source + '/css/*.css')
    .pipe(newer(dirs.build + '/css'))
    .pipe(postcss(postCssPlugins))
    .pipe(cleanss())
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.build + '/css'));
});



// Images Copying
// gulp.task('copy:images', function () {
//   return gulp.src(
//     [dirs.source + '/images/*.{gif,png,jpg,jpeg,svg}',
//     '!' + dirs.source + '/images/svg-sprite/*.svg']
//     )
//     .pipe(newer(dirs.build + '/images'))
//     .pipe(size({
//       title: 'Размер',
//       showFiles: true,
//       showTotal: false,
//     }))
//     .pipe(gulp.dest(dirs.build + '/images'));
// });

gulp.task('copy:images', function () {
  return gulp.src(lists.img)
    .pipe(newer(dirs.build + '/images'))
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.build + '/images'));
});



// Videos Copying
gulp.task('copy:videos', function () {
  return gulp.src(dirs.source + '/videos/*.{mp4,ogv,webm}')
    .pipe(newer(dirs.build + '/videos'))
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.build + '/video'));
});



// Fonts Copying
gulp.task('copy:fonts', function () {
  return gulp.src(dirs.source + '/fonts/*.{ttf,woff,woff2,eot,svg}')
    .pipe(newer(dirs.build + '/fonts'))
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.build + '/fonts'));
});



// Javascript Files Copying
gulp.task('copy:js', function () {
  return gulp.src(
    [ dirs.source + '/javascript/*.js',
      '!' + dirs.source + '/javascript/script.js'
    ])
    .pipe(newer(dirs.build + '/javascript'))
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.build + '/javascript'));
});



// Script
gulp.task('js', function () {
  return gulp.src(dirs.source + '/javascript/script.js')
    .pipe(plumber({
      errorHandler: function(err) {
        notify.onError({
          title: 'Javascript concat/uglify error',
          message: err.message
        })(err);
        this.emit('end');
      }
    }))
    .pipe(rigger())
    .pipe(concat('script.js'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulpIf(!isDevelopment, uglify()))
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.build + '/javascript'));
});



// Svg Sprite
gulp.task('sprite:svg', function (callback) {
  let spritePath = dirs.source + '/images/sprite-svg';
  if(fileExist(spritePath) !== false) {
    return gulp.src(spritePath + '/*.svg')
      .pipe(svgmin(function (file) {
        return {
          plugins: [{
            cleanupIDs: {
              minify: true
            }
          }]
        }
      }))
      .pipe(svgstore({ inlineSvg: true }))
      .pipe(cheerio({
        run: function($) {
          $('svg').attr('style',  'display:none');
        },
        parserOptions: {
          xmlMode: true
        }
      }))
      .pipe(rename('sprite-svg.svg'))
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.source + '/images'));
  }
  else {
    callback();
  }
});



// Png Sprite
gulp.task('sprite:png', function (callback) {
  let spritePngPath = dirs.source + '/images/sprite-png';
  if(fileExist(spritePngPath) !== false) {
    let fileName = 'sprite-png.png';
    let spriteData = gulp.src('src/images/sprite-png/*.png')
    .pipe(spritesmith({
      imgName: fileName,
      cssName: 'sprite.less',
      cssFormat: 'less',
      padding: 4,
      imgPath: '../images/' + fileName
    }));
    let imgStream = spriteData.img //
    .pipe(buffer())
    .pipe(imagemin({
      use: [pngquant()]
    }))
    .pipe(gulp.dest('dist/images'));
    let cssStream = spriteData.css
    .pipe(gulp.dest(dirs.source + '/less/'));
    return merge(imgStream, cssStream);
  } else {
    callback();
  }
});



gulp.task('serve', ['build'], function () {

  browserSync.init({
    server: dirs.build,
    startPath: 'index.html',
    open: false,
    port: 8080,
    logPrefix: 'project'
  });

  // gulp.watch(
  // [  dirs.source + '/*.html',
  //    dirs.source + '/_include/*.html'], ['watch:html']
  // );

  // Html
  gulp.watch([
    '*.html',
    '_include/*.html',
    dirs.blocksDirName + '/**/*.html'
  ], {cwd: dirs.source}, ['watch:html']);

  // gulp.watch(
  // [  dirs.source + '/less/style.less',
  //    dirs.source + '/less/**/*.less'], ['style']
  // );

  // Styles
  gulp.watch([
    dirs.source + 'less/style.less',
    dirs.source + dirs.blocksDirName + '/**/*.less',
    projectConfig.addCssBefore,
    projectConfig.addCssAfter,
  ], ['style']);


  gulp.watch(dirs.source + '/javascript/script.js', ['js']);
  gulp.watch(dirs.source + '/css/*.css', ['copy:css']);


  // Fonts
  gulp.watch(dirs.source + '/fonts/*.{ttf,woff,woff2,eot,svg}', ['copy:fonts']);

  // Videos
  gulp.watch(dirs.source + '/videos/*.{mp4,ogv,webm}', ['copy:videos']);

  gulp.watch(dirs.source + '/images/sprite-svg/*.svg', ['sprite:svg', 'html']);
  gulp.watch(dirs.source + '/images/sprite-png/*.png', ['sprite:png']);

  // gulp.watch(
  // [  dirs.source + '/images/*.{gif,png,jpg,jpeg,svg}',
  //    '!' + dirs.source + '/images/sprite-svg.svg'], ['copy:images']
  // );

  // Images
  if(lists.img.length) {
    gulp.watch(lists.img, ['watch:images']);
  }

});

gulp.task('watch:html', ['html'], reload);

gulp.task('watch:images', ['copy:images'], reload);


gulp.task('build', function (callback) {
  gulpSequence(
    'clean',
    ['sprite:svg', 'sprite:png'],
    ['style', 'copy:images', 'copy:fonts', 'copy:css', 'copy:js', 'js'],
    'html',
    callback
  );
});

gulp.task('default', ['serve']);



function getFilesList(config) {

  let res = {
    'css': [],
    // 'js': [],
    'img': [],
  };

  // Style
  for (let blockName in config.blocks) {
    res.css.push(config.directories.source + config.directories.blocksDirName + '/' + blockName + '/' + blockName + '.less');
    if(config.blocks[blockName].length) {
      config.blocks[blockName].forEach(function(elementName) {
        res.css.push(config.directories.source + config.directories.blocksDirName + '/' + blockName + '/' + blockName + elementName + '.less');
      });
    }
  }
  res.css = res.css.concat(config.addCssAfter);
  res.css = config.addCssBefore.concat(res.css);

  // Images
  for (let blockName in config.blocks) {
    res.img.push(config.directories.source + config.directories.blocksDirName + '/' + blockName + '/img/*.{jpg,jpeg,gif,png,svg}');
  }
  res.img = config.addImages.concat(res.img);

  return res;
}