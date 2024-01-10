module.exports = async function(RED) {
  const { got } = await import('got')

  function CoreHttpRequestStreamFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.createStream = (opts, msg, snd, dne, pipeend) => {
      let progressIndicator = ({ transferred, total, percent }) => {}
      if ( cfg.progress ) {
        progressIndicator = ({ transferred, total, percent }) => {
          const percentage = Math.round(percent * 100);
          pipeend.status({ fill: "yellow", shape: "ring", text: "progress: " + percentage + "%" });
        }
      }

      if ( cfg.method == "GET" ) {
        return got.stream(opts.url, {
          headers: cfg.ignhdrs ? {} : (msg.headers || {})
        }).on("downloadProgress", progressIndicator)
      } else if ( cfg.method == "POST") {
        
      }
    };

    node.on('close', function() {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function(msg, send, done) {
        // Send a message and how to handle errors.
        try {
          RED.util.evaluateNodeProperty(cfg.urlproperty, cfg.urlpropertyType,
            node, msg, (err, result) => {
              if (err) {
                done(RED._("httprequeststream.error.url_not_defined"))
                return
              } else {
                (msg._streamPipeline || []).push({ 
                  id: node.id,
                  url: result 
                })
                
                send(msg);
                done();
              }
            })
          } catch ( err ) {
            done(err.message, { ...msg, error: err })
          }
    });
  }

  RED.nodes.registerType("HttpRequestStream", CoreHttpRequestStreamFunctionality);

}
