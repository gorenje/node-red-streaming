module.exports = function(RED) {
  const stream = require('node:stream')
  
  /* 
   * From https://discourse.nodered.org/t/streaming-nodes/84422/37
   */
  class ByLine extends stream.Transform {
    constructor(options) {
      super(options);
    }

    _transform(chunk, encoding, callback) {
      let data = chunk.toString();

      if (this._lastLineData) {
        data = this._lastLineData + data;
      }

      let lines = data.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/g);
      this._lastLineData = lines.splice(lines.length - 1, 1)[0];
      lines.forEach(this.push.bind(this));

      callback();
    }

    _flush(done) {
      if (this._lastLineData) {
        this.push(this._lastLineData);
      }
      this._lastLineData = null;
      done();
    }
  }

  function CoreJsonLStreamFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.createStream = (ndef, msg, snd, dne, stNde) => {
      return [
        new ByLine({ objectMode: true }), 
        stream.Transform({
          objectMode: true,
          transform: function (entry, e, cb) {
            let m = RED.util.cloneMessage(msg);

            try {
              m.payload = JSON.parse(entry)
            } catch (ex) {
              m.error = ex
              m.line = entry
              m.payload = undefined
            }

            snd(m, false)
            cb();
          }
        })
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

  RED.nodes.registerType("JsonLStream", CoreJsonLStreamFunctionality);

}
