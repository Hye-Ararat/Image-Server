const crypto = require('crypto')
const fs = require('fs')
let createHash = (filename) => {
    return new Promise((resolve, reject) => {
        const stream = fs.ReadStream(filename);
        const hashSum = crypto.createHash('SHA256');
        stream.on("data", (d) => hashSum.update(d))
        stream.on("end", () => {
            const hex = hashSum.digest('hex');
            return resolve(hex)
        })
        
    })
    } 
let createCombinedHash = (filename, filename2) => {
    return new Promise(async (resolve, reject) => {
        const stream = fs.ReadStream(filename2);
        const fileBuffer = fs.readFileSync(filename);
        const hashSum = crypto.createHash('SHA256');
        stream.on("data", (d) => hashSum.update(d))
        stream.on("end", () => {
            hashSum.update(fileBuffer);
            const hex = hashSum.digest('hex');
            return resolve(hex);
        })
       
    })
}
module.exports.createHash = createHash
module.exports.createCombinedHash = createCombinedHash