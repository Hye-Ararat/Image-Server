const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();
const { PrismaClient } = require("@prisma/client");
const fs = require('fs');
const hash = require('./lib/hash')

const prisma = new PrismaClient()

// default options
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));
app.get("/streams/v1/index.json", async (req, res) => {
   const images = await prisma.image.findMany({});
   let products = [];
   for (let i = 0; i < images.length; i++) {
      products.push(`${images[i].os}:${images[i].release}:${images[i].architecture}:${images[i].variant}`)
   }
   return res.json({
      index: {
         images: {
            datatype: "image-downloads",
            path: "streams/v1/images.json",
            format: "products:1.0",
            products: products
         }
      },
      format: "index:1.0"
   })
})
app.get('/streams/v1/images.json', async (req, res) => {

   const images = await prisma.image.findMany({});
   let data = {
      "content_id": "images",
      "datatype": "image-downloads",
      "format": "products:1.0",
      "products": {}
   }
   for (let i = 0; i < images.length; i++) {
      const image_path_releases = __dirname + `\\storage\\${images[i].os}\\${images[i].release}\\${images[i].architecture}\\${images[i].variant}`
      let versions = {}
      fs.readdirSync(image_path_releases).forEach(version_dir => {
         let files =  fs.readdirSync(image_path_releases + "\\" + version_dir)
         let files_list = {};
         files.forEach(file => {
            let type;
            if (file.includes("qcow2")) type = "disk-kvm.img";
            if (file.includes("squashfs")) type = "squashfs";
            if (file.includes(".vcdiff")) type = "squashfs.vcdiff";
            if (!type) type = file;
            console.log(image_path_releases + "\\" + version_dir + "\\" + file)
            files_list[file] = {
               "ftype": type,
               "sha256": hash.createHash(image_path_releases + "\\" + version_dir + "\\" + file),
               "size": fs.statSync(image_path_releases + "\\" + version_dir + "\\" + file).size,
               "path": `storage/${images[i].os}/${images[i].release}/${images[i].architecture}/${images[i].variant}`+ "/" + version_dir + "/" + file
            }
            if (type == "lxd.tar.xz") {
               files_list[file].combined_sha256 = hash.createCombinedHash(image_path_releases + "\\" + version_dir + "\\" + file, image_path_releases + "\\" + version_dir + "\\root.tar.xz")
               files_list[file].combined_rootxz_sha256 = hash.createCombinedHash(image_path_releases + "\\" + version_dir + "\\" + file, image_path_releases + "\\" + version_dir + "\\root.tar.xz")
               if (files.find(f => f.includes(".qcow2"))) {
                  files_list[file]["combined_disk-kvm-img_sha256"] = "thegeniuswillbeheresoon"
               }
            }
         })
         versions[version_dir] = {
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
   return res.json(data)
})
var path = require('path');
app.get("/storage/*", (req,res) => {
   if (req.url.includes("..")) return res.status(418).send("Nice try bitch.")
   console.log(path.normalize(req.url.toString().replace("/", "\\")))
   if (fs.statSync("." + req.url).isFile()) {
      if (req.path.includes('tar.xz')) {
         res.setHeader("Accept-Ranges", "Bytes")
         res.setHeader("Content-Length", fs.statSync("." + path.normalize(req.url.toString().replace("/", "\\"))).size)
         res.setHeader("Content-Type", "application/x-xz")
      }
      fs.createReadStream("." + path.normalize(req.url.toString().replace("/", "\\"))).pipe(res)
   } else {
      return res.status(418).send("Nice try bitch.")
   }

})
app.post('/images', function (req, res) {
   const d = new Date()
     if (!req.files["rootfs"]) {
         if (!req.files['kvmdisk']) return res.json({error:"KVM image not present in form body"})
         var { aliases, os, release, releasetitle, variant, architecture, requirements } = req.body
         fs.mkdirSync('./path/to/my/directory', { recursive: true })
     } else {
      if (!req.files['rootfs']) return res.json({error:"Rootfs not present in form body"})
      if (!req.files['lxdmeta']) return res.json({error:"LXD meta not present in form body"})
      var zero = d.getMonth() < 10 ? "0":""
      var zeroday = d.getDate() < 10 ? "0":""
      var date = `${d.getFullYear()}${zero + d.getMonth()}${zeroday + d.getDate()}_${d.getHours() + ":" + d.getMinutes()}`
      var { aliases, os, release, releasetitle, variant, architecture, requirements } = req.body
      fs.mkdirSync(path.normalize(`./storage/${os}/${release}/${architecture}/${variant}/`), { recursive: true })
     }
});

app.listen(3002)
