const path = require('path');
const fs = require('fs');

const exclude = ''.split(',');

function isJK() {
    const p = process.argv[2];
    if (p && typeof p === 'string' && /jk/.test(p)){
        return true
    }
    return false;
}

function writeFiles(files) {
    let count = 0;
    files.forEach((file) => {
        if (file.changed) {
            fs.writeFileSync(file.path, file.data);
            count++;
        }
    });
}

function readPages(ROOT) {
    const filePaths = [];
    getFilePaths(ROOT, filePaths);
    const files = getFiles(filePaths);
    return files;
}

function getFiles(filePaths) {
    const files = filePaths
        .filter(filePath => filePath.indexOf('.htm') > -1)
        .map((filePath) => {
            return {
                path: filePath,
                name: getFileName(filePath),
                data: fs.readFileSync(filePath).toString(),
                changed: false
            }
        });
    addHelpers(files);
    return files;
}
function getFilePaths(dir, collection) {
    let files;
    if (fs.lstatSync(dir).isDirectory() && notExcluded(dir)) {
        files = fs.readdirSync(dir);
        files.forEach(function (file) {
            if (file.indexOf('.') !== 0) {
                const curFile = path.join(dir, file);
                if (fs.lstatSync(curFile).isDirectory()) {
                    getFilePaths(curFile, collection);
                } else {
                    collection.push(curFile);
                }
            }
        });
    }
}

function notExcluded(dir) {
    const dirName = getFileName(dir);
    return !exclude.includes(dirName);
}

function getFileName(filePath) {
    return filePath.split(path.sep)[filePath.split(path.sep).length - 1].replace('.html', '');
}

function addHelpers(files) {
    files.get = (name) => {
        if (/\.html/.test(name)) {
            name = name.replace('.html', '');
        }
        return files.find(file => file.name === name);
    };
}

function getFiles(dir) {
    if (fs.lstatSync(dir).isDirectory() && notExcluded(dir)) {
        const files = [];
        fs.readdirSync(dir).forEach((fileName) => {
            if (fileName.indexOf('.') !== 0) {
                const filePath = path.join(dir, fileName);
                    files.push({
                        type: fs.lstatSync(filePath).isDirectory() ? 'dir' : 'file',
                        name: fileName,
                        path: filePath
                    });
            }
        });
        return files;
    }
    return 'invalid directory';
}
function getFilesizeInBytes(filePath) {
    const fileSizeInBytes = fs.statSync(filePath).size;
    return fileSizeInBytes / 1000000.0; // megabytes
}

function getFileName(filePath) {
    return filePath.split(path.sep).pop();
}

function getFile(filePath) {
    const size = getFilesizeInBytes(filePath);
    if (size > 1) {
        return `File size ${Math.round(size)}MB is too large to open`;
    }
    return fs.readFileSync(filePath).toString();
}

function mkdir(dirPath) {
    if (!fs.existsSync(dirPath)){
        fs.mkdirSync(dirPath);
    }
}

function copyFile(filePathFrom, filePathTo) {
    fs.writeFileSync(filePathTo, fs.readFileSync(filePathFrom));
}

function readJson(jsonPath) {
    return JSON.parse(fs.readFileSync(jsonPath).toString());
}

function writeJson(jsonPath, data) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

function updateBuildPackage(src = './scripts', dst = './build') {
    if (isJK()) {
        console.log('building JK package...');
    }
    let hasJk = true;
    let jkPackage;
    const jkPkg = path.join(src, '/jk-package.json');
    const srcPkg = path.join(src, '/package.json');
    const bldPkg = path.join(dst, '/package.json');
    if (!fs.existsSync(jkPkg)) {
        hasJk = false;
    }
    if (!fs.existsSync(srcPkg)) {
        throw new Error(`source package not found with path: ${srcPkg}`);   
    }
    if (!fs.existsSync(dst)) {
        throw new Error(`build directory not found with path: ${dst}`);   
    }
    if (hasJk) {
        jkPackage = readJson(jkPkg);
    }
    const sourcePackage = readJson(srcPkg);
    const mainPackage = readJson('./package.json');

    if (mainPackage.version !== sourcePackage.version) {
        // main has been manually updated
    } else {
        // increment main version
        const version = mainPackage.version.split('.');
        version[2] = parseInt(version[2], 10) + 1;
        mainPackage.version = version.join('.');
        console.log('package.version changed to:', mainPackage.version);
    }
    sourcePackage.version = mainPackage.version;
    if (hasJk) {
        jkPackage.version = mainPackage.version;
    }
    const keysToCopy = isJK() ? ['dependencies'] : ['dependencies', 'repository', 'keywords'];
    keysToCopy.forEach((key) => {
        if (mainPackage[key]) {
            sourcePackage[key] = mainPackage[key];
            if (hasJk) {
                jkPackage[key] = mainPackage[key];
            }
        }
    });

    if (hasJk) {
        writeJson(jkPkg, jkPackage);
    }
    writeJson(srcPkg, sourcePackage);
    writeJson('./package.json', mainPackage);
    copyFile(isJK() ? jkPkg : srcPkg, bldPkg);
    console.log('package.version updated to:', mainPackage.version);
}

function swapJK(...filenames) { 
    const bldSrc = './build'
    filenames.forEach((filename) => { 
        const filePath = path.join(bldSrc, path.sep, filename);
        console.log('swapping text for', filePath);
        const file = fs.readFileSync(filePath).toString().replace(/@clubajax/g, '@janiking')
        fs.writeFileSync(filePath, file);
    })
}

module.exports = {
    getFile,
    getFileName,
    getFiles,
    readPages,
    writeFiles,
    mkdir,
    copyFile,
    readJson,
    writeJson,
    swapJK,
    updateBuildPackage
};
