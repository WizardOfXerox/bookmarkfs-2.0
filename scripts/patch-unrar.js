const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/node-unrar-js/esm/js/unrar.js');

if (!fs.existsSync(filePath)) {
    console.log('node-unrar-js is not installed, skipping patch.');
    process.exit(0);
}

const code = fs.readFileSync(filePath, 'utf8');

// 1. Find and replace createNamedFunction
const target1 = 'function createNamedFunction(name,body){name=makeLegalFunctionName(name);return new Function("body","return function "+name+"() {\\n"+\'    "use strict";\'+"    return body.apply(this, arguments);\\n"+\"};\\n\")(body)}';
const target1Alt = 'function createNamedFunction(name,body){return body}';

if (code.includes(target1Alt)) {
    console.log('node-unrar-js is already patched.');
    process.exit(0);
}

if (code.indexOf(target1) === -1) {
    console.error('ERROR: createNamedFunction signature not found in unrar.js');
    process.exit(1);
}

// 2. Find and replace craftInvokerFunction using bracket matching
const target2Start = 'function craftInvokerFunction(humanName,';
const idx2 = code.indexOf(target2Start);
if (idx2 === -1) {
    console.error('ERROR: craftInvokerFunction start not found in unrar.js');
    process.exit(1);
}

let braceCount = 0;
let endIdx2 = -1;
for (let i = idx2; i < code.length; i++) {
    if (code[i] === '{') {
        braceCount++;
    } else if (code[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
            endIdx2 = i;
            break;
        }
    }
}

if (endIdx2 === -1) {
    console.error('ERROR: Matching closing brace for craftInvokerFunction not found');
    process.exit(1);
}

const target2Block = code.substring(idx2, endIdx2 + 1);

if (!target2Block.includes('new_(Function,args1)')) {
    console.error('ERROR: craftInvokerFunction block does not contain expected code');
    process.exit(1);
}

let newCode = code.replace(target1, target1Alt);

const newCraftInvoker = `function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc){var argCount=argTypes.length;if(argCount<2){throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!")}var isClassMethodFunc=argTypes[1]!==null&&classType!==null;var needsDestructorStack=false;for(var i=1;i<argTypes.length;++i){if(argTypes[i]!==null&&argTypes[i].destructorFunction===undefined){needsDestructorStack=true;break}}var returns=argTypes[0].name!=="void";return function(){if(arguments.length!==argCount-2){throwBindingError("function "+humanName+" called with "+arguments.length+" arguments, expected "+(argCount-2)+" args!")}var destructors=needsDestructorStack?[]:null;var dtorStack=needsDestructorStack?destructors:null;var wiredArgs=[];if(isClassMethodFunc){var thisWired=argTypes[1].toWireType(dtorStack,this);wiredArgs.push(thisWired)}for(var i=0;i<argCount-2;++i){var argWired=argTypes[i+2].toWireType(dtorStack,arguments[i]);wiredArgs.push(argWired)}var rv=cppInvokerFunc.apply(null,[cppTargetFunc].concat(wiredArgs));if(needsDestructorStack){runDestructors(destructors)}else{var offset=isClassMethodFunc?1:0;if(isClassMethodFunc&&argTypes[1].destructorFunction!==null){argTypes[1].destructorFunction(wiredArgs[0])}for(var i=0;i<argCount-2;++i){var argType=argTypes[i+2];if(argType.destructorFunction!==null){argType.destructorFunction(wiredArgs[i+offset])}}}if(returns){return argTypes[0].fromWireType(rv)}}}`;

newCode = newCode.replace(target2Block, newCraftInvoker);

fs.writeFileSync(filePath, newCode, 'utf8');
console.log('SUCCESS: node-unrar-js patched successfully!');
