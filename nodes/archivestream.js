module.exports = async function(RED) {

  const fs = await import('node:fs')
  const unzipper = require('unzipper')
  const path = require('node:path')
  const fsex = require('fs-extra')
  const tarStream = require('tar-stream');

  function CoreArchiveStreamFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;
    
    node.createStream = (opts, msg, snd, dne, stNde) => {

      let progressIndicator = (path,size) => {};
      if ( cfg.progress ) {
        progressIndicator = (path, size) => {
          stNde.status({fill: "yellow", shape: "ring", text: path});
        }
      }

      if (cfg.direction == "extract" && cfg.format == "zip") {
        return unzipper.Parse().on('entry', (entry) => {

            const destPath = path.join(opts.dirname, entry.path)
            //const type = entry.type; // 'Directory' or 'File'
            //const size = entry.vars.uncompressedSize; // There is also compressedSize;

            if (entry.type == "File") {
              fsex.ensureDirSync(path.dirname(destPath));

              entry.pipe(fs.createWriteStream(destPath))
                .on('finish', () => {
                  let m = RED.util.cloneMessage(msg);
                  m.path = destPath
                  m.type = (entry.type || "").toLowerCase()
                  m.size = entry.vars.uncompressedSize
                  m.payload = undefined
                  snd(m, false)
                  progressIndicator(m.path, m.size)
                });
            } else if (entry.type == "Directory") {
              fsex.ensureDirSync(destPath);
              let m = RED.util.cloneMessage(msg);
              m.path = destPath
              m.type = (entry.type || "").toLowerCase()
              snd(m, false)
              entry.autodrain();
            }
          })
      }
      
      if ( cfg.direction == "extract" && cfg.format == "tar") {
        return tarStream.extract().on('entry', function (header, stream, next) {
          const destPath = path.join(opts.dirname, header.name)

          fsex.ensureDirSync(path.dirname(destPath));

          stream.pipe(fs.createWriteStream(destPath))

          stream.on('end', () => {
              let m = RED.util.cloneMessage(msg);
              m.path = destPath
              m.type = (header.type || "").toLowerCase()
              m.size = header.size
              m.payload = undefined
              snd(m, false)
              progressIndicator(m.path, m.size)
              next()
          });

          stream.resume()
        })
      }

      dne( RED._("archivestream.error.operation_not_supported"), msg)
    };

    node.on('close', function() {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function (msg, send, done) {
      // Send a message and how to handle errors.
      try {
        RED.util.evaluateNodeProperty(cfg.dirnameproperty, cfg.dirnamepropertyType,
          node, msg, async (err, result) => {
            if (err) {
              done(RED._("archivestream.error.dirname_not_defined"))
              return
            } else {
              (msg._streamPipeline || []).push({
                id: node.id,
                dirname: result
              })

              try {
                fsex.ensureDirSync(result);
              } catch (ex) {
                done(RED._("archivestream.error.failed_to_create_dir", { directory: result }), msg)
                return
              }

              send(msg);
              done();
            }
          })
      } catch (err) {
        // use done if the node won't send anymore messages for the
        // message it received.
        msg.error = err
        done(err.message, msg)
      }
    });
  }

  RED.nodes.registerType("ArchiveStream", CoreArchiveStreamFunctionality);

}
