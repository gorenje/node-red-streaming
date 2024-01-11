module.exports = async function(RED) {
  const { got } = await import('got')

  /**
   * Case insensitive header value update util function
   * @param {object} headersObject The opt.headers object to update
   * @param {string} name The header name
   * @param {string} value The header value to set (if blank, header is removed)
   */
  const updateHeader = function (headersObject, name, value) {
    const hn = name.toLowerCase();
    const keys = Object.keys(headersObject);
    const matchingKeys = keys.filter(e => e.toLowerCase() == hn)
    const updateKey = (k, v) => {
      delete headersObject[k]; //delete incase of case change
      if (v) { headersObject[name] = v } //re-add with requested name & value
    }
    if (matchingKeys.length == 0) {
      updateKey(name, value)
    } else {
      matchingKeys.forEach(k => {
        updateKey(k, value);
      });
    }
  }

  function CoreHttpRequestStreamFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.createStream = (opts, msg, snd, dne, stNde) => {
      let progressIndicator = ({ transferred, total, percent }) => {}
      if ( cfg.progress ) {
        progressIndicator = ({ transferred, total, percent }) => {
          const percentage = Math.round(percent * 100);
          stNde.status({ fill: "yellow", shape: "ring", text: "progress: " + percentage + "%" });
        }
      }

      /* Partly taken from http request node --> 
       * https://github.com/node-red/node-red/blob/ce5b6a8024533958f9ba68eb4df464e61c775bce/packages/node_modules/%40node-red/nodes/core/network/21-httprequest.js
       */
      let ctSet = "Content-Type"; // set default camel case
      let clSet = "Content-Length";
      const normaliseKnownHeader = function (name) {
        const _name = name.toLowerCase();
        // only normalise the known headers used later in this
        // function. Otherwise leave them alone.
        switch (_name) {
          case "content-type":
            ctSet = name;
            name = _name;
            break;
          case "content-length":
            clSet = name;
            name = _name;
            break;
        }
        return name;
      }

      let reqOpts = {};
      reqOpts.headers = {};

      //add msg.headers 
      //NOTE: ui headers will take precidence over msg.headers
      if (msg.headers && !cfg.ignhdrs) {
        for (let hn in msg.headers) {
          const name = normaliseKnownHeader(hn);
          updateHeader(reqOpts.headers, name, msg.headers[hn]);
        }
      }

      //add/remove/update headers from UI.
      if (cfg.headers.length) {
        for (let index = 0; index < cfg.headers.length; index++) {
          const header = cfg.headers[index];
          let headerName, headerValue;
          if (header.keyType === "other") {
            headerName = header.keyValue
          } else if (header.keyType === "msg") {
            RED.util.evaluateNodeProperty(header.keyValue, header.keyType, node, msg, (err, value) => {
              if (err) {
                //ignore header
              } else {
                headerName = value;
              }
            });
          } else {
            headerName = header.keyType
          }
          if (!headerName) {
            continue; //skip if header name is empyy
          }
          if (header.valueType === "other") {
            headerValue = header.valueValue
          } else if (header.valueType === "msg") {
            RED.util.evaluateNodeProperty(header.valueValue, header.valueType, node, msg, (err, value) => {
              if (err) {
                //ignore header
              } else {
                headerValue = value;
              }
            });
          } else {
            headerValue = header.valueType
          }

          const hn = normaliseKnownHeader(headerName);
          updateHeader(reqOpts.headers, hn, headerValue);
        }
      }

      console.log( "Config", [cfg,opts,reqOpts])

      if ( cfg.method == "GET" ) {
        console.log( "handling get REquest")
        return got.stream(opts.url, reqOpts).on("downloadProgress", progressIndicator)
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
