module.exports = async function(RED) {
  const { parse } = await import('@fast-csv/parse')

  function CoreCsvStreamFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.createStream = (ndef, msg, snd, dne, stNde) => {
      /* 
      * See more options see --> https://c2fo.github.io/fast-csv/docs/parsing/options#skiprows 
      */
      return parse({
        headers: cfg.hdrin,
        delimiter: cfg.sep,
        ignoreEmpty: !cfg.include_empty_strings,
      }).on('data', (d) => {
        let m = RED.util.cloneMessage(msg);
        m.payload = d
        snd(m)
      })
    };

    node.on('close', function() {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function(msg, send, done) {

        // Send a message and how to handle errors.
        try {
          (msg._streamPipeline || []).push({
            id: node.id
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

  RED.nodes.registerType("CsvStream", CoreCsvStreamFunctionality);

}
