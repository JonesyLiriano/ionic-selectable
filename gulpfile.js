const gulp = require('gulp'),
  childProcess = require('child_process'),
  _ = require('lodash'),
  uglify = require('gulp-uglify-es').default,
  rename = require('gulp-rename'),
  jsonEditor = require('gulp-json-editor'),
  fs = require('fs'),
  sass = require('gulp-sass'),
  path = require('path'),
  ngPackagr = require('ng-packagr'),
  ngPackagePath = path.normalize(path.join(__dirname, './ng-package.json')),
  tsConfigPath = path.normalize(path.join(__dirname, './tsconfig.dist.json')),
  packageConfig = JSON.parse(fs.readFileSync('./package.json')),
  paths = {
    gulp: 'node_modules/gulp/bin/gulp.js',
    ngPackagr: 'node_modules/ng-packagr/cli/main.js',
    ionic: 'C:/Program Files/nodejs/node_modules/ionic/bin/ionic',
    images: {
      root: 'images/'
    },
    src: {
      css: `src/app/components/${packageConfig.name}/${packageConfig.name}.component.scss`
    },
    dist: {
      root: 'dist/',
      package: 'dist/package.json',
      bundles: {
        root: 'dist/bundles/',
        file: `dist/bundles/${packageConfig.name}.umd.js`,
        mapFile: `dist/bundles/${packageConfig.name}.umd.js.map`,
        minFile: `${packageConfig.name}.umd.min.js`
      },
      esm5: {
        root: 'dist/esm5/',
        file: `dist/esm5/${packageConfig.name}.js`,
        minFile: `${packageConfig.name}.min.js`
      },
      esm2015: {
        root: 'dist/esm2015/',
        file: `dist/esm2015/${packageConfig.name}.js`,
        minFile: `${packageConfig.name}.min.js`
      }
    }
  };

function executeCommand(command, parameters) {
  if (command === 'gulp') {
    command = paths.gulp;
  } else if (command === 'ionic') {
    command = paths.ionic;
  }

  var _parameters = _.cloneDeep(parameters);
  _parameters.unshift(command);

  childProcess.spawnSync('node', _parameters, { stdio: 'inherit' });
}

async function copyCss() {
  return Promise.all([
    new Promise(function (resolve, reject) {
      // Copy original SCSS file to "module" folder from package.json.
      // That's where Ionic will be looking for it.
      fs.createReadStream(paths.src.css).pipe(
        fs.createWriteStream(`${paths.dist.esm5.root}${packageConfig.name}.component.scss`)
          .on('error', reject)
          .on('close', resolve)
      );
    }),
    new Promise(function (resolve, reject) {
      gulp.src(paths.src.css)
        // This is to create a minified CSS file in order to use in StackBlitz demos.
        // The minified file isn't required for component to work.
        .pipe(sass({
          outputStyle: 'compressed'
        }))
        .pipe(rename(`${packageConfig.name}.component.min.css`))
        .pipe(gulp.dest(paths.dist.esm5.root))
        .on('error', reject)
        .on('end', resolve);
    })
  ]);
}

async function copyImages() {
  return new Promise(function (resolve, reject) {
    gulp.src(`${paths.images.root}**/*`)
      .pipe(gulp.dest(`${paths.dist.root}${paths.images.root}`))
      .on('error', reject)
      .on('end', resolve);
  });
}

async function minifyJS() {
  // Minify files.
  return Promise.all([
    new Promise(function (resolve, reject) {
      gulp.src(paths.dist.esm5.file)
        .pipe(uglify())
        .on('error', reject)
        .pipe(rename(paths.dist.esm5.minFile))
        .pipe(gulp.dest(paths.dist.esm5.root))
        .on('error', reject)
        .on('end', resolve);
    }),
    new Promise(function (resolve, reject) {
      gulp.src(paths.dist.esm2015.file)
        .pipe(uglify())
        .on('error', reject)
        .pipe(rename(paths.dist.esm2015.minFile))
        .pipe(gulp.dest(paths.dist.esm2015.root))
        .on('error', reject)
        .on('end', resolve);
    })
  ]).then(function () {
    // Remove source files.
    fs.unlinkSync(paths.dist.bundles.file);
    fs.unlinkSync(paths.dist.bundles.mapFile);
    fs.unlinkSync(paths.dist.esm5.file);
    fs.unlinkSync(paths.dist.esm2015.file);
  });
}

async function modifyPackageJson() {
  return new Promise(function (resolve, reject) {
    gulp.src(paths.dist.package)
      .pipe(jsonEditor(function (json) {
        json.main = `bundles/${paths.dist.bundles.minFile}`;
        json.module = `esm5/${paths.dist.esm5.minFile}`;
        json.es2015 = `esm2015/${paths.dist.esm2015.minFile}`;
        delete json.cordova;
        delete json.devDependencies;
        delete json.dependencies;
        return json;
      }))
      .pipe(gulp.dest(paths.dist.root))
      .on('error', reject)
      .on('end', resolve);
  });
}

async function build() {
  await ngPackagr
    .ngPackagr()
    .forProject(ngPackagePath)
    .withTsConfig(tsConfigPath)
    .build()
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  await minifyJS();
  await modifyPackageJson();
  await copyCss();
  await copyImages();

  // Remove archive created by ng-packagr.
  fs.unlinkSync('dist.tgz');
}

gulp.task('heroku', function () {
  executeCommand('ionic', ['build', '--minifyjs', '--minifycss', '--optimizejs']);
});
gulp.task('build', build);
gulp.task('default', ['build']);
