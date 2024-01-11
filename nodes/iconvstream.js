module.exports = function(RED) {
  const iconv = require('iconv-lite');

  function CoreIconvStreamFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.createStream = (opts, msg, snd, dne, stNde) => {
      return [
        iconv.decodeStream(cfg.fromenc),
        iconv.encodeStream(cfg.toenc)
      ]
    };

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

  RED.nodes.registerType("IconvStream", CoreIconvStreamFunctionality);

}
