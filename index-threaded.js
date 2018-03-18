// THIS IS HALF-BAKED AND DOESN'T WORK

const fs = require('fs');
const sharp = require('sharp');
const glob = require("glob")
const jpeg = require('jpeg-js')
const luminance = require('color-luminance');
const argv = require('minimist')(process.argv.slice(2));
const ProgressBar = require('progress');
const json2csv = require('json2csv');
var Worker = require('webworker-threads').Worker;
// var w = new Worker('worker.js'); // Standard API

console.log('This doesn\'t work yet.');
process.exit(-1);

// You may also pass in a function:
var worker = new Worker(function(){
  postMessage("I'm working before postMessage('ali').");
  this.onmessage = function(event) {
    postMessage('Hi ' + event.data);
    self.close();
  };
});
worker.onmessage = function(event) {
  console.log("Worker said : " + event.data);
};
worker.postMessage('ali');

if (argv._.length < 1) {
  console.log("USAGE: " + __filename + " path/to/directory OPTIONS");
  console.log('OPTIONS:');
  console.log('  --timeInterval=N');
  console.log('  --outputFile=path/to/file');
  console.log('  --maxFiles=N');
  process.exit(-1);
}

const path = argv._[0];
const timeInterval = parseFloat(argv.timeInterval);
const outputFile = argv.outputFile;
const maxFiles = argv.maxFiles || Infinity;
 
const allFiles = glob.sync(path, { realpath: true }).sort();
const fileCount = Math.min(maxFiles, allFiles.length);
const filesToProcess = allFiles.slice(0, fileCount);
console.log('processing files:');
console.log(filesToProcess.slice(0, 3).concat(fileCount > 3 ? '...' : '').join('\n'));

async function getLuminanceFile(file) {
  const data = await sharp(file).toBuffer();
  jpegData = jpeg.decode(data);

  const colorData = jpegData.data;
  let lsum = 0;
  for (let i = 0; i < colorData.length; i += 4) {
    lsum += luminance(colorData[i], colorData[i + 1], colorData[i + 2]);
  }

  return lsum / (colorData.length / 4);
}

async function processFiles(files) {
  const bar = new ProgressBar(':luma [:bar] :percent (:current/:total) elapsed:::elapseds remaining::etas', {
    total: files.length,
    width: 50,
  });

  const results = [];
  let index = 0;

  for (file of files) {
    const luma = await getLuminanceFile(file);
    bar.tick({ luma });
    results.push({
      time: index * timeInterval,
      luma,
    })
    index += 1;
  }

  if (outputFile) {
    const csv = json2csv({ data: results, fields: ['time', 'luma'] });

    await fs.writeFile(outputFile, csv, (err) => {
      if (err) throw err;
      console.log('file saved >>', outputFile);
    });
  }

  // could async be faster?
  // await Promise.all(files.slice(0, 6).map(async (file) => {
  //   const luma = await getLuminanceFile(file);
  //   bar.tick({ luma });
  // }));
}

async function main() {
  await processFiles(filesToProcess);
  console.log('done!');
}

main();
