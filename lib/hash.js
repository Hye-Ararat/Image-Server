const crypto = require('crypto')
const fs = require('fs')
let createHash = (filename) => {
    const fileBuffer = fs.readFileSync(filename);
    const hashSum = crypto.createHash('SHA256');
    hashSum.update(fileBuffer);
    
    const hex = hashSum.digest('hex');
    return hex
} 
let createCombinedHash = (filename, filename2) => {
    const fileBuffer = fs.readFileSync(filename);
    const fileBuffer2 = fs.readFileSync(filename2);
    const hashSum = crypto.createHash('SHA256');
    hashSum.update(fileBuffer);
    hashSum.update(fileBuffer2);
    const hex = hashSum.digest('hex');
    return hex
}
module.exports.createHash = createHash
module.exports.createCombinedHash = createCombinedHash