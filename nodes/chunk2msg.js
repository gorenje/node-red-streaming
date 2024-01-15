module.exports = function(RED) {

  const stream = require('node:stream')
  
  function CoreChunk2MsgFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.createStream = (opts, msg, snd, dne, stNde) => {
      return [
        stream.Transform({
          transform: function (chunk, e, cb) {
            let m = RED.util.cloneMessage(msg);
            m.payload = chunk
            m.encoding = e
            snd(m, false)
            cb();
          }
        })
      ]
    }

    node.on('close', function() {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function (msg, send, done) {
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

  RED.nodes.registerType("Chunk2Msg", CoreChunk2MsgFunctionality);

}
