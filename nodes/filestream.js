module.exports = async function(RED) {
  
  const fs = await import('node:fs')
  const path = require("node:path");
  const fsex = require('fs-extra')
  const stream = require('node:stream')

  function CoreFileStreamFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.createStream = (opts, msg, snd, dne, stNde) => {
      let progressIndicator = new stream.Transform({
        transform: (chunk, encoding, callback) => {
          callback(null, chunk);
        }
      })

      if (cfg.progress) {
        let totalBytes = 0;
        progressIndicator = new stream.Transform({
          transform: (chunk, encoding, callback) => {
            totalBytes += chunk.length;
            stNde.status({ fill: "yellow", shape: "ring", text: totalBytes + " bytes" });
            callback(null, chunk);
          }
        })
      }

      if (cfg.direction == "read") {

        if (!fs.existsSync(opts.filename)) {
          dne(RED._("filestream.error.file_does_not_exist", { filename: opts.filename }), msg)
          return
        }

        return fs.createReadStream(opts.filename).pipe(progressIndicator)

      } else if (cfg.direction == "write") {
        var dir = path.dirname(opts.filename);

        fsex.ensureDirSync(dir);

        var writestream = fs.createWriteStream(
          opts.filename
        ).on('open', () => {
          stNde.status({ fill: "blue", shape: "ring", text: "started" });
        }).on('close', () => {
          stNde.status({ fill: "green", shape: "dot", text: "done: " + writestream.bytesWritten + " bytes" });
        })

        return [progressIndicator, writestream]
      }
    };

    node.on('close', function() {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function(msg, send, done) {
        // Send a message and how to handle errors.
        try {
          RED.util.evaluateNodeProperty(cfg.filenameproperty, cfg.filenamepropertyType,
            node, msg, async (err, result) => {
              if (err) {
                done(RED._("filestream.error.filename_not_defined"))
                return
              } else {              
                (msg._streamPipeline || []).push({
                  id: node.id, 
                  filename: result
                })
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

  RED.nodes.registerType("FileStream", CoreFileStreamFunctionality);

}
