(async () => {
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
      return data;
   }
   let cached_images = await fetchImages();
   setInterval(async () => {
      cached_images = await fetchImages();
   }, 8000)
   app.get('/streams/v1/images.json', async (req, res) => {
      return res.json(cached_images)
   })
   var path = require('path');
   app.get("/storage/*", (req, res) => {
      if (req.url.includes("..")) return res.status(418).send("Nice try bitch.")
      console.log(path.normalize(req.url.toString().replace("/", "/")))
      if (fs.statSync("." + req.url.replace(':', '-')).isFile()) {
         if (req.path.includes('tar.xz')) {
            res.setHeader("Accept-Ranges", "Bytes")
            res.setHeader("Content-Length", fs.statSync("." + path.normalize(req.url.toString().replace("/", "/").replace(':', '-'))).size)
            res.setHeader("Content-Type", "application/x-xz")
         } else {
            res.setHeader("Accept-Ranges", "Bytes")
            res.setHeader("Content-Length", fs.statSync("." + path.normalize(req.url.toString().replace("/", "/").replace(':', '-'))).size)
         }
         fs.createReadStream("." + path.normalize(req.url.toString().replace("/", "/").replace(':', '-'))).pipe(res)
      } else {
         return res.status(418).send("Nice try bitch.")
      }
   
   })
   app.post('/images', function (req, res) {
      try {
         const d = new Date()
         if (!req.files["rootfs"] && req.files['kvmdisk'] && req.files['lxdmeta']) {
            var { aliases, os, release, releasetitle, variant, architecture, requirements } = req.body
            fs.mkdirSync('./path/to/my/directory', { recursive: true })
         } else if (req.files['rootfs'] && req.files['rootfs'] && !req.files['kvmdisk']) {
            var zero = d.getMonth() < 10 ? "0" : ""
            var zeroday = d.getDate() < 10 ? "0" : ""
            var zerohours = d.getHours() < 10 ? "0" : ""
            var zerominutes = d.getMinutes() < 10 ? "0" : ""
            var date = `${d.getFullYear()}${zero + d.getMonth()}${zeroday + d.getDate()}_${zerohours + d.getHours() + "-" + zerominutes + d.getMinutes()}`
            var { aliases, os, release, releasetitle, variant, architecture, requirements } = req.body
            if (!aliases || !os || !release || !releasetitle || !variant || !architecture) return res.json({ error: "Missing required fields" })
            fs.mkdirSync(path.normalize(`./storage/${os}/${release}/${architecture}/${variant}/${date}`), { recursive: true })
            fs.writeFileSync(path.normalize(`./storage/${os}/${release}/${architecture}/${variant}/${date}/root.tar.xz`), req.files['rootfs'].data)
            fs.writeFileSync(path.normalize(`./storage/${os}/${release}/${architecture}/${variant}/${date}/lxd.tar.xz`), req.files['lxdmeta'].data)
            prisma.image.create({
               data: {
                  os: os,
                  release: release,
                  architecture: architecture,
                  variant: variant,
                  aliases: aliases,
                  release_title: releasetitle,
                  lxd_requirements: requirements ? JSON.stringify(requirements) : '{ }',
               }
            }).then(image => {
               res.json({
                  success: true,
                  data: image
               })
            })
   
         }
      } catch (error) {
         console.log(error)
         res.status(500).send({
            success: false,
            error: error
         })
      }
   
   });
   
   app.listen(3002)
   
})();
