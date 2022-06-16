
const { PrismaClient } = require("@prisma/client");
const fs = require('fs');
const hash = require('./hash')

const prisma = new PrismaClient()
async function fetchImages() {
      
    const images = await prisma.image.findMany({});
    let data = {
       "content_id": "images",
       "datatype": "image-downloads",
       "format": "products:1.0",
       "products": {}
    }
    for (let i = 0; i < images.length; i++) {
       const image_path_releases = __dirname + `/storage/${images[i].os}/${images[i].release}/${images[i].architecture}/${images[i].variant}`
       let versions = {}
       fs.readdirSync(image_path_releases).forEach(version_dir => {
          let files = fs.readdirSync(image_path_releases + "/" + version_dir.replace(':', '-'))
          let files_list = {};
          files.forEach(file => {
             let type;
             if (file.includes("qcow2")) type = "disk-kvm.img";
             if (file.includes("squashfs")) type = "squashfs";
             if (file.includes(".vcdiff")) type = "squashfs.vcdiff";
             if (!type) type = file;
             console.log(image_path_releases + "/" + version_dir.replace(':', '-') + "/" + file)
             files_list[file] = {
                "ftype": type,
                "sha256": hash.createHash(image_path_releases + "/" + version_dir + "/" + file),
                "size": fs.statSync(image_path_releases + "/" + version_dir + "/" + file).size,
                "path": `storage/${images[i].os}/${images[i].release}/${images[i].architecture}/${images[i].variant}` + "/" + version_dir + "/" + file
             }
             if (type == "lxd.tar.xz") {
                console.log()
                files_list[file].combined_sha256 = hash.createCombinedHash(image_path_releases + "/" + version_dir.replace(':', '-') + "/" + file, image_path_releases + "/" + version_dir.replace(':', '-') + "/root.tar.xz")
                files_list[file].combined_rootxz_sha256 = hash.createCombinedHash(image_path_releases + "/" + version_dir.replace(':', '-') + "/" + file, image_path_releases + "/" + version_dir.replace(':', '-') + "/root.tar.xz")
                if (files.find(f => f.includes(".qcow2"))) {
                   files_list[file]["combined_disk-kvm-img_sha256"] = hash.createCombinedHash(image_path_releases + "/" + version_dir.replace(':', '-') + "/" + file, image_path_releases + "/" + version_dir.replace(':', '-') + "/disk.qcow2")
                }
             }
          })
          versions[version_dir.replace('-', ':')] = {
             items: files_list
          }
       })
       data.products[`${images[i].os}:${images[i].release}:${images[i].architecture}:${images[i].variant}`] = {
          "arch": images[i].architecture,
          "os": images[i].os,
          "release": images[i].release,
          "variant": images[i].variant,
          "lxd_requirements": images[i].lxd_requirements ? JSON.parse(images[i].lxd_requirements) : {},
          "aliases": images[i].aliases,
          "release_title": images[i].release_title,
          "versions": versions
       }
    }
    fs.writeFileSync('./cache.json', JSON.stringify(data, null, 2))
 }
    fetchImages()
    setInterval(fetchImages, 10000)