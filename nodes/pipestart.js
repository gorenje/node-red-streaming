module.exports = function(RED) {
  function CorePipeStartFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.on('close', function() {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function(msg, send, done) {
        // Send a message and how to handle errors.
        try {
          try {
            msg._streamPipeline = []
            send(msg);
            done();
          } catch ( err ) {
            // use node.error if the node might send subsequent messages
            node.error("error occurred", { ...msg, error: err })
            done();
          }
        } catch (err) {
          // use done if the node won't send anymore messages for the
          // message it received.
          msg.error = err
          done(err.message, msg)
        }
    });
  }

  RED.nodes.registerType("PipeStart", CorePipeStartFunctionality);

}
