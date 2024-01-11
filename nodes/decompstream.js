module.exports = async function(RED) {

  const bz2 = require('unbzip2-stream');
  const fs = await import('node:fs')
  const readline = require('node:readline');
  const tarStream = require('tar-stream');
  const streamx = require('streamx');
  const pakoGzip = require('pako');
  const lzmaNative = require('lzma-native');
  const zlib = require('node:zlib')

  function CoreDeCompStreamFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.createStream = (opts, msg, snd, dne, stNde) => {
      if ( cfg.direction == "decompress") {

        switch (cfg.format) {
          case 'bz2':
            return bz2()
          case 'gz':
            return zlib.createGunzip()
          case 'xz':
            return lzmaNative.createDecompressor()

          default:
            dne(RED._("decompstream.error.unknown_format", { format: cfg.format }), msg)
        }

      } else if ( cfg.direction == "compress") {
        switch (cfg.format ) {
          case 'bz2':
            dne(RED._("decompstream.error.unknown_format", { format: cfg.format }), msg)
            return
            
          case 'gz':
            return zlib.createGzip()
          case 'xz':
            return lzmaNative.createCompressor();

          default:
            dne(RED._("decompstream.error.unknown_format", { format: cfg.format }), msg)
        }

      } else {
        dne(RED._("decompstream.error.unknown_direction", { direction: cfg.direction }), msg)
      }
    };
    
    node.on('close', function() {
      node.status({});
    });

    node.on("input", function (msg, send, done) {
      // How to send a status update

      // Send a message and how to handle errors.
      try {
        (msg._streamPipeline || []).push({
          id: node.id,
        })

        send(msg);
        done();
      } catch (err) {
        // use done if the node won't send anymore messages for the
        // message it received.
        msg.error = err
        done(err.message, msg)
      }
    });
  }

  RED.nodes.registerType("DeCompStream", CoreDeCompStreamFunctionality);

}
