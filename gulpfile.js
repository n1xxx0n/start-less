'use strict';

// Global
const fs = require('fs');
const gulp = require('gulp');
const projectConfig = require('./projectConfig.json');
const dirs = projectConfig.directories;
const lists = getFilesList(projectConfig);

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
const newer = require('gulp-newer');
const replace = require('gulp-replace');
const rigger = require('gulp-rigger');
const wait = require('gulp-wait');

// Pug
const pug = require('gulp-pug');
const htmlbeautify = require('gulp-html-beautify');

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
const postcssEasingGradients = require('postcss-easing-gradients');

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
  postcssEasingGradients(),
  autoprefixer(),
  inlineSVG(),
  objectFitImages(),
  sorting(sortingOptions),
  mqpacker({
    sort: true
  }),
  perfectionist({
    indentSize: 2,
    trimLeadingZero: false,
    maxSelectorLength: 1
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

function fileExist(filepath) {
  let flag = true;
  try{
    fs.accessSync(filepath, fs.F_OK);
  }catch(e){
    flag = false;
  }
  return flag;
}



let styleImports = '';
lists.css.forEach(function(blockPath) {
  styleImports += '@import (less) \''+blockPath+'\';\n';
});
fs.writeFileSync(dirs.source + 'less/style.less', styleImports);

let pugMixins = '';
lists.pug.forEach(function(blockPath) {
  pugMixins += 'include '+blockPath+'\n';
});
fs.writeFileSync(dirs.source + 'pug/mixins.pug', pugMixins);



// Clean the dist folder
gulp.task('clean', () => {
  console.log('---------- Clean the dist folder');
  return del(dirs.build + '/**/*')
});



// Html
gulp.task('html', () => {
  console.log('---------- Compiling Pug files')
  return gulp.src(dirs.source + '/*.pug')
    .pipe(plumber({
      errorHandler: function(err) {
        notify.onError({
          title: 'Pug compilation error',
          message: err.message
        })(err);
        this.emit('end');
      }
    }))
    .pipe(pug())
    .pipe(htmlbeautify({
      indent_size: 2,
      unformatted: [
        'abbr', 'area', 'b', 'bdi', 'bdo', 'br', 'cite',
        'code', 'data', 'datalist', 'del', 'dfn', 'em', 'embed', 'i', 'ins', 'kbd', 'keygen', 'map', 'mark', 'math', 'meter',
        'object', 'output', 'progress', 'q', 'ruby', 's', 'samp', 'small',
         'strong', 'sub', 'sup', 'template', 'time', 'u', 'var', 'wbr', 'text',
        'acronym', 'address', 'big', 'dt', 'ins', 'strike', 'tt'
      ]
    }))
    .pipe(gulp.dest(dirs.build));
});



// less
gulp.task('style', () => {
  console.log('---------- Compiling Less files')
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



// CSS copying
gulp.task('copy:css', (callback) => {
  console.log('---------- Copying separate css files')
  if(projectConfig.copiedCss.length) {
    return gulp.src(projectConfig.copiedCss)
      .pipe(postcss(postCssPlugins))
      .pipe(cleanss())
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.build + '/css'))
  } else {
    callback();
  }
});



// Images copying
gulp.task('copy:images', () => {
  console.log('---------- Copying images')
  return gulp.src(lists.img)
    .pipe(newer(dirs.build + '/img'))
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.build + '/img'));
});



// Videos copying
gulp.task('copy:videos', () => {
  console.log('---------- Copying video files')
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
gulp.task('copy:fonts', () => {
  console.log('---------- Copying fonts')
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
gulp.task('copy:js', (callback) => {
  console.log('---------- Copying separate js files')
  if(projectConfig.copiedJs.length) {
    return gulp.src(projectConfig.copiedJs)
      .pipe(uglify())
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.build + '/js'));
  } else {
    callback();
  }
});



// Script
gulp.task('js', (callback) => {
  if(lists.js.length > 0) {
    console.log('---------- JS concat/uglify');
    return gulp.src(lists.js)
      .pipe(plumber({
        errorHandler: function(err) {
          notify.onError({
            title: 'Javascript concat/uglify error',
            message: err.message
          })(err);
          this.emit('end');
        }
      }))
      .pipe(concat('script.js'))
      .pipe(rename({ suffix: '.min' }))
      .pipe(gulpIf(!isDevelopment, uglify()))
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.build + '/js'));
  } else {
    callback();
  }
});


// SVG Sprite
let spriteSvgPath = dirs.source + dirs.blocksDirName + '/sprite-svg/svg/';
gulp.task('sprite:svg', (callback) => {
  if((projectConfig.blocks['sprite-svg']) !== undefined) {
    if(fileExist(spriteSvgPath) !== false) {
      console.log('---------- Create SVG sprite');
      return gulp.src(spriteSvgPath + '*.svg')
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
      .pipe(gulp.dest(dirs.source + dirs.blocksDirName + '/sprite-svg/img/'));
    } else {
      console.log('There is no directory with .svg');
      callback();
    }
  } else {
    console.log('There is no SVG sprite in current project');
    callback();
  }
});



// PNG Sprite
let spritePngPath = dirs.source + dirs.blocksDirName + '/sprite-png/png/';
gulp.task('sprite:png', (callback) => {
  if((projectConfig.blocks['sprite-png']) !== undefined) {
    if(fileExist(spritePngPath) !== false) {
      console.log('---------- Create PNG sprite');
      del(dirs.source + dirs.blocksDirName + '/sprite-png/img/*.png');
      let fileName = 'sprite-png.png';
      let spriteData = gulp.src(spritePngPath + '*.png')
      .pipe(spritesmith({
        imgName: fileName,
        cssName: 'sprite-png.less',
        padding: 4,
        imgPath: '../img/' + fileName
      }));

      let imgStream = spriteData.img
      .pipe(buffer())
      .pipe(imagemin({
        use: [pngquant()]
      }))
      .pipe(gulp.dest(dirs.source + dirs.blocksDirName + '/sprite-png/img/'));

      let cssStream = spriteData.css
      .pipe(gulp.dest(dirs.source + dirs.blocksDirName + '/sprite-png/'));

      return merge(imgStream, cssStream);
    } else {
      console.log('There is no directory with icons');
      callback();
    }
  } else {
    console.log('There is PNG sprite in current project');
    callback();
  }
});



// Build
gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('sprite:svg', 'sprite:png'),
  gulp.parallel('style', 'js', 'copy:css', 'copy:images', 'copy:js', 'copy:fonts'),
  'html'
));


gulp.task('serve', gulp.series('build', () => {

  browserSync.init({
    server: dirs.build,
    port: 8080,
    startPath: 'index.html',
    open: false,
    logPrefix: 'project'
  });

  // HTML
  let pugPaths = [
    dirs.source + '*.pug',
    dirs.source + 'pug/*.pug',
  ];

  for (let i = 0, len = lists.blocksDirs.length; i < len; ++i) {
    pugPaths.push(dirs.source + lists.blocksDirs[i] + '*.pug');
  }

  if (lists.pug.length) {
    gulp.watch(pugPaths, gulp.series('html', reload));
  }

  // Style
  let stylePaths = [
    dirs.source + 'less/style.less',
    dirs.source + 'less/mixins/*.less',
  ];

  for (let i = 0, len = lists.blocksDirs.length; i < len; ++i) {
    stylePaths.push(dirs.source + lists.blocksDirs[i] + '*.less');
  }

  stylePaths.concat(projectConfig.addCssBefore, projectConfig.addCssAfter);
  gulp.watch(stylePaths, gulp.series('style'));

  // Separate css files
  if (projectConfig.copiedCss.length) {
    gulp.watch(projectConfig.copiedCss, gulp.series('copy:css', reload));
  }

  // Images
  if (lists.img.length) {
    gulp.watch(lists.img, gulp.series('copy:images', reload));
  }

  // JS
  if (lists.js.length) {
    gulp.watch(lists.js, gulp.series('js', reload));
  }

  // JS
  if (projectConfig.copiedJs.length) {
    gulp.watch(projectConfig.copiedJs, gulp.series('copy:js', reload));
  }

  // Fonts
  gulp.watch(dirs.source + 'fonts/*.{ttf,woff,woff2,eot,svg}', gulp.series('copy:fonts', reload));

  // SVG sprite
  if ((projectConfig.blocks['sprite-svg']) !== undefined) {
    gulp.watch('*.svg', {cwd: spriteSvgPath}, gulp.series('sprite:svg', reload));
  }

  // PNG sprite
  if ((projectConfig.blocks['sprite-png']) !== undefined) {
    gulp.watch('*.png', {cwd: spritePngPath}, gulp.series('sprite:png', reload));
  }
}));



// Default task
gulp.task('default',
  gulp.series('serve')
);



function getFilesList(config) {

  let res = {
    'css': [],
    'js': [],
    'img': [],
    'pug': [],
    'blocksDirs': [],
  };

  for (let blockName in config.blocks) {
    var blockPath = config.directories.source + config.directories.blocksDirName + '/' + blockName + '/';

    if (fileExist(blockPath)) {

      // Pug
      if (fileExist(blockPath + blockName + '.pug')) {
        res.pug.push('../' + config.directories.blocksDirName + '/' + blockName + '/' + blockName + '.pug');
      }
      // else {
      //   console.log(`Block ${blockName} does not have pug file`);
      // }

      // Style
      if (fileExist(blockPath + blockName + '.less')) {
        res.css.push(blockPath + blockName + '.less');
        if(config.blocks[blockName].length) {
          config.blocks[blockName].forEach(function(elementName) {
            if(fileExist(blockPath + blockName + elementName + '.less')){
              res.css.push(blockPath + blockName + elementName + '.less');
            }
          });
        }
      }
      // else {
      //   console.log(`Block ${blockName} does not have less file`);
      // }

      // JS
      if (fileExist(blockPath + blockName + '.js' )) {
        res.js.push(blockPath + blockName + '.js');
        if(config.blocks[blockName].length) {
          config.blocks[blockName].forEach(function(elementName) {
            if(fileExist(blockPath + blockName + elementName + '.js')){
              res.js.push(blockPath + blockName + elementName + '.js');
            }
          });
        }
      }
      // else {
      //   console.log(`Block ${blockName} does not have js file`);
      // }

      // Images
      res.img.push(config.directories.source + config.directories.blocksDirName + '/' + blockName + '/img/*.{jpg,jpeg,gif,png,svg}');

      // List of directories
      res.blocksDirs.push(config.directories.blocksDirName + '/' + blockName + '/');
    }
  }

  res.css = res.css.concat(config.addCssAfter);
  res.css = config.addCssBefore.concat(res.css);
  res.js = res.js.concat(config.addJsAfter);
  res.js = config.addJsBefore.concat(res.js);
  res.img = config.addImages.concat(res.img);

  return res;
}