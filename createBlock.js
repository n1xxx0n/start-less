'use strict';

const fs = require('fs');
const projectConfig = require('./projectConfig.json');

const dirs = projectConfig.directories;
const mkdirp = require('mkdirp');

const blockName = process.argv[2];
const defaultExtensions = ['less', 'pug', 'img'];
const extensions = uniqueArray(defaultExtensions.concat(process.argv.slice(3)));

// Use: node createBlock.js [name of block]

if (blockName) {
  const dirPath = `${dirs.source + dirs.blocksDirName}/${blockName}/`;

  mkdirp(dirPath, (err) => {

    if (err) {
      console.error(`Отмена операции: ${err}`);
    }

    else {
      console.log(`Создание папки ${dirPath} (если отсутствует)`);

      extensions.forEach((extention) => {
        const filePath = `${dirPath + blockName}.${extention}`;
        let fileContent = '';
        let fileCreateMsg = '';

        if (extention === 'less') {
          fileContent = `.${blockName} {\n  \n}`;
          // fileCreateMsg = '';

          let hasThisBlock = false;
          for (const block in projectConfig.blocks) {
            if (block === blockName) {
              hasThisBlock = true;
              break;
            }
          }
          if (!hasThisBlock) {
            projectConfig.blocks[blockName] = [];
            const newPackageJson = JSON.stringify(projectConfig, '', 2);
            fs.writeFileSync('./projectConfig.json', newPackageJson);
            fileCreateMsg = 'Подключение блока добавлено в projectConfig.json';
          }
        }

        else if (extention === 'html') {
          fileContent = ``;
          // fileCreateMsg = '';
        }

        else if (extention === 'js') {
          fileContent = '// document.addEventListener(\'DOMContentLoaded\', function(){});\n// (function(){\n// код\n// }());\n';
        }

        else if (extention === 'img') {
          const imgFolder = `${dirPath}img/`;
          if (fileExist(imgFolder) === false) {
            mkdirp(imgFolder, (err) => {
              if (err) console.error(err);
              else console.log(`Создание папки: ${imgFolder} (если отсутствует)`);
            });
          } else {
            console.log(`Папка ${imgFolder} НЕ создана (уже существует) `);
          }
        }

        if (fileExist(filePath) === false && extention !== 'img') {
          fs.writeFile(filePath, fileContent, (err) => {
            if (err) {
              return console.log(`Файл НЕ создан: ${err}`);
            }
            console.log(`Файл создан: ${filePath}`);
            if (fileCreateMsg) {
              console.warn(fileCreateMsg);
            }
          });
        } else if (extention !== 'img') {
          console.log(`Файл НЕ создан: ${filePath} (уже существует)`);
        }

      });
    }
  });
} else {
  console.log('[NTH] Отмена операции: не указан блок');
}

function uniqueArray(arr) {
  const objectTemp = {};
  for (let i = 0; i < arr.length; i++) {
    const str = arr[i];
    objectTemp[str] = true;
  }
  return Object.keys(objectTemp);
}

function fileExist(path) {
  const fs = require('fs');
  try {
    fs.statSync(path);
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}