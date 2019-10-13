const { readFileSync, writeFileSync } = require('fs');
const { PropTypesParser } = require('./prop-types-parser');
const { convertParseToJsDoc } = require('./convert-parse-to-jsdoc');
const fileName = process.argv[2];
const outputDir = process.argv[3];
const showWarnings = process.argv[4];

const name = fileName.split('/');
const componentName = name[name.length-2];
const actualFileName = name[name.length-1];
const outputFileName = `${outputDir}/${componentName}-${actualFileName}`;

const myParser = new PropTypesParser({ fileName, showWarnings: showWarnings==="true" });
let text;
try {
    text = readFileSync(fileName, { encoding: 'utf8' })
} catch(err) {
    console.error('error reading from file', fileName)
}

const parse = myParser.parse(text);
const converted = convertParseToJsDoc(parse);

if (converted === "") {
    if (showWarnings === "true") {
        console.error(`\x1b[33mWarning:\x1b[0m No PropTypes declaration found in ${fileName}`)
    }
} else if (outputDir === "") {
    console.log(converted);
} else {
    try {
        writeFileSync(outputFileName, converted);
    } catch(err) {
        console.error('and error ocurred while writing', outputFileName);
    }
}