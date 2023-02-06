(async () => {
   const sanitize = require('./lib/safe')
   const express = require('express');
   const fileUpload = require('express-fileupload');
   const app = express();
   require('dotenv').config()
   const { PrismaClient } = require("@prisma/client");
   const fs = require('fs');
   const hash = require('./lib/hash')
   const cors = require('cors')

   const prisma = new PrismaClient()
   function cacheRefresh() {
      const { spawn } = require('child_process')
      var cache_process = spawn('node', ['./lib/cache.js'])
      cache_process.stdout.on('data', (data) => {
         console.log("[cache]", data.toString())
      })
      cache_process.stderr.on('data', (data) => {
         console.log("[error]", data.toString())
      })
   }
   cacheRefresh()

   // default options
   app.use(fileUpload({
      useTempFiles: true,
      tempFileDir: "./tmp"
   }));
   app.use(express.urlencoded({ extended: true }));
   app.use(cors())
   app.get("/streams/v1/index.json", async (req, res) => {
      const images = await prisma.image.findMany({});
      let products = [];
      for (let i = 0; i < images.length; i++) {
         products.push(`${images[i].os.toLowerCase()}:${images[i].release.toLowerCase()}:${images[i].architecture}:${images[i].variant}`)
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
      var data = JSON.parse(fs.readFileSync('./cache.json', 'utf8'))
      return res.json(data)
   })
   app.get("/findImageId", async (req, res) => {
      let { os, release, architecture, variant } = req.query
      os = os.toLowerCase()
      release = release.toLowerCase()
      architecture = architecture.toLowerCase()
      variant = variant.toLowerCase()
      const image = await prisma.image.findFirst({
         where: {
            os: os,
            release: release,
            architecture: architecture,
            variant: variant
         }
      })
      if (image) {
         return res.json({
            id: image.id
         })
      }
      return res.status(404).send({
         error: "Image not found"
      })
   })
   app.get("/image/:id/extensions", async (req, res) => {
      let id = sanitize(req.params.id)
      const image = await prisma.image.findFirst({
         where: {
            id: id
         }
      })
      if (!image) return res.json({ error: "Image not found" });
      let extensions = []
      let data;
      try {
         data = fs.readdirSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/extensions`)
      } catch (error) {
         return res.json({
            extensions: []
         })
      }
      for (let i = 0; i < data.length; i++) {
         if (data[i].endsWith(".json")) {

         } else {
            extensions.push({
               name: (data[i].replace(".araratExtension.js", "")).replace(".lavaExtension.js", ""),
               type: data[i].split(".")[1].split("Extension")[0]
            })
         }
      }
      return res.json({
         extensions: extensions
      })
   })
   app.get("/image/:id/widgets", async (req, res) => {
      let id = sanitize(req.params.id)
      const image = await prisma.image.findFirst({
         where: {
            id: id
         }
      })
      if (!image) return res.json({ error: "Image not found" });
      let widgets = []
      let data;
      try {
         data = fs.readdirSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/widgets`)
      } catch (error) {
         return res.json({
            widgets: []
         })
      }
      for (let i = 0; i < data.length; i++) {
         widgets.push({
            name: (data[i].replace(".araratWidget.js", "")).replace(".lavaWidget.js", ""),
            type: data[i].split(".")[1].split("Widget")[0]
         })
      }
      return res.json({
         widgets: widgets
      })
   })
   app.get("/image/:id/widget/:widget", async (req, res) => {
      let widget = sanitize(req.params.widget)
      let id = sanitize(req.params.id)
      console.log(id)
      const image = await prisma.image.findFirst({
         where: {
            id: id
         }
      })
      if (image) {
         let file;
         try {
            if (req.query.type == "ararat") {
               file = fs.readFileSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/widgets/${widget}.araratWidget.js`, 'utf8')
            } else if (req.query.type == "lava") {
               file = fs.readFileSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/widgets/${widget}.lavaWidget.js`, 'utf8')
            } else {
               file = fs.readFileSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/widgets/${widget}.araratWidget.js`, 'utf8')
            }
         } catch {
            return res.json({
               error: "Widget not found"
            })
         }
         return res.send(file)
      } else {
         return res.json({
            error: "Image not found"
         })
      }
   })
   app.get("/image/:id/extension/:extension", async (req, res) => {
      let extension = sanitize(req.params.extension)
      let id = sanitize(req.params.id)
      console.log(id)
      const image = await prisma.image.findFirst({
         where: {
            id: id
         }
      })
      if (image) {
         let file;
         try {
            if (req.query.type == "ararat") {
               file = fs.readFileSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/extensions/${extension}.araratExtension.js`, 'utf8')
            } else if (req.query.type == "lava") {
               file = fs.readFileSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/extensions/${extension}.lavaExtension.js`, 'utf8')
            } else {
               file = fs.readFileSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/extensions/${extension}.araratExtension.js`, 'utf8')
            }
         } catch {
            return res.json({
               error: "Extension not found"
            })
         }
         return res.send(file)
      } else {
         return res.json({
            error: "Image not found"
         })
      }
   })
   app.get("/image/:id/extensionInfo/:extension", async (req, res) => {
      let extension = sanitize(req.params.extension)
      let id = sanitize(req.params.id)
      console.log(id)
      const image = await prisma.image.findFirst({
         where: {
            id: id
         }
      })
      if (image) {
         let file;
         try {
            if (req.query.type == "ararat") {
               file = fs.readFileSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/extensions/${extension}.araratExtensionInfo.json`, 'utf8')
            } else if (req.query.type == "lava") {
               file = fs.readFileSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/extensions/${extension}.lavaExtensionInfo.json`, 'utf8')
            } else {
               file = fs.readFileSync(`./storage/${image.os.toLowerCase()}/${image.release.toLowerCase()}/extensions/${extension}.araratExtensionInfo.json`, 'utf8')
            }
         } catch {
            return res.json({
               error: "Extension not found"
            })
         }
         return res.send(file)
      } else {
         return res.json({
            error: "Image not found"
         })
      }
   })
   var path = require('path');
   app.get("/storage/*", (req, res) => {
      if (req.url.includes("..")) return res.status(418).send("Nice try bitch.")
      var paths = sanitize(path.normalize(req.url.toString().replace("/", "/")))
      console.log(path.normalize(req.url.toString().replace("/", "/")))
      if (fs.statSync("." + paths.replace(':', '-')).isFile()) {
         if (req.path.includes('tar.gz')) {
            res.setHeader("Accept-Ranges", "Bytes")
            res.setHeader("Content-Length", fs.statSync("." + path.normalize(paths.toString().replace("/", "/").replace(':', '-'))).size)
            res.setHeader("Content-Type", "application/tar+gzip")
         } else {
            res.setHeader("Accept-Ranges", "Bytes")
            res.setHeader("Content-Length", fs.statSync("." + path.normalize(paths.toString().replace("/", "/").replace(':', '-'))).size)
         }
         fs.createReadStream("." + path.normalize(paths.toString().replace("/", "/").replace(':', '-'))).pipe(res)
      } else {
         return res.status(418).send("Nice try bitch.")
      }

   })
   app.post('/images', async function (req, res) {
      if (req.headers.authorization !== "Bearer " + process.env.APP_KEY) return res.status(403).send("Unauthorized");
      try {
         const d = new Date()
         if (!req.files["rootfs"] && req.files['kvmdisk'] && req.files['lxdmeta']) {
            var { aliases, os, release, releasetitle, variant, architecture, requirements } = req.body
            var zero = d.getMonth() < 10 ? "0" : ""
            var zeroday = d.getDate() < 10 ? "0" : ""
            var zerohours = d.getHours() < 10 ? "0" : ""
            var zerominutes = d.getMinutes() < 10 ? "0" : ""
            var date = `${d.getFullYear()}${zero + d.getMonth()}${zeroday + d.getDate()}_${zerohours + d.getHours() + "-" + zerominutes + d.getMinutes()}`
            var { aliases, os, release, releasetitle, variant, architecture, requirements, properties } = req.body
            if (!aliases || !os || !release || !releasetitle || !variant || !architecture) return res.json({ error: "Missing required fields" })
            let alrExisted = fs.existsSync(path.normalize(`./storage/${os.toLowerCase()}/${release.toLowerCase()}/${architecture}/${variant}`))
            fs.mkdirSync(path.normalize(`./storage/${os.toLowerCase()}/${release.toLowerCase()}/${architecture}/${variant}/${date}`), { recursive: true })
            fs.mkdirSync(path.normalize(`./storage/${os.toLowerCase()}/${release.toLowerCase()}/extensions`), { recursive: true })

            fs.renameSync(req.files['kvmdisk'].tempFilePath, path.normalize(`./storage/${os.toLowerCase()}/${release.toLowerCase()}/${architecture}/${variant}/${date}/disk.qcow2`))
            fs.renameSync(req.files['lxdmeta'].tempFilePath, path.normalize(`./storage/${os.toLowerCase()}/${release.toLowerCase()}/${architecture}/${variant}/${date}/lxd.tar.gz`))
            /*Properties example
            {
               "environment": [{"key": "key", "value": "value"}],
               "startup": "echo startup example and env vars work like $EXAMPLE"
            }
            */
            if (!alrExisted) {
               
               prisma.image.create({
                  data: {
                     os: os.toLowerCase(),
                     release: release.toLowerCase(),
                     architecture: architecture.toLowerCase(),
                     variant: variant.toLowerCase(),
                     aliases: aliases.toLowerCase(),
                     release_title: releasetitle.toLowerCase(),
                     lxd_requirements: requirements ? JSON.stringify(requirements) : '{ }',
                     properties: properties ? JSON.stringify(properties) : '{ }',
                  }
               }).then(image => {
                  res.json({
                     success: true,
                     data: image
                  })
                  cacheRefresh()
               })
            } else {
               res.json({
                  success: true,
                  data: "Image already existed"
               })
               cacheRefresh()
            }
         } else if (req.files['rootfs'] && req.files['rootfs'] && !req.files['kvmdisk']) {
            var zero = d.getMonth() < 10 ? "0" : ""
            var zeroday = d.getDate() < 10 ? "0" : ""
            var zerohours = d.getHours() < 10 ? "0" : ""
            var zerominutes = d.getMinutes() < 10 ? "0" : ""
            var date = `${d.getFullYear()}${zero + d.getMonth()}${zeroday + d.getDate()}_${zerohours + d.getHours() + "-" + zerominutes + d.getMinutes()}`
            var { aliases, os, release, releasetitle, variant, architecture, requirements, properties } = req.body
            if (!aliases || !os || !release || !releasetitle || !variant || !architecture) return res.json({ error: "Missing required fields" })
            let alrExisted = fs.existsSync(path.normalize(`./storage/${os.toLowerCase()}/${release.toLowerCase()}/${architecture}/${variant}`))
            fs.mkdirSync(path.normalize(`./storage/${os.toLowerCase()}/${release.toLowerCase()}/${architecture}/${variant}/${date}`), { recursive: true })
            fs.renameSync(req.files['rootfs'].tempFilePath, path.normalize(`./storage/${os.toLowerCase()}/${release.toLowerCase()}/${architecture}/${variant}/${date}/root.tar.gz`))
            fs.renameSync(req.files['lxdmeta'].tempFilePath, path.normalize(`./storage/${os.toLowerCase()}/${release.toLowerCase()}/${architecture}/${variant}/${date}/lxd.tar.gz`))
            if (!alrExisted) {
               prisma.image.create({
                  data: {
                     os: os,
                     release: release,
                     architecture: architecture,
                     variant: variant,
                     aliases: aliases,
                     release_title: releasetitle,
                     lxd_requirements: requirements ? JSON.stringify(requirements) : '{ }',
                     properties: properties ? JSON.stringify(properties) : '{ }',
                  }
               }).then(image => {
                  res.json({
                     success: true,
                     data: image
                  })
                  cacheRefresh()
               })
            } else {
               res.json({
                  success: true,
                  data: "Image already existed"
               })
               cacheRefresh()
            }

         } else {
            return res.json({ error: "Missing required fields" })
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
