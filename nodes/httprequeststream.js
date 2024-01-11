module.exports = async function(RED) {
  const { got } = await import('got')
  var querystring = require("querystring");
  const FormData = require('form-data');
  
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

      let paytoqs = false
      let paytobody = false
      if (cfg.paytoqs === true || cfg.paytoqs === "query") { paytoqs = true; }
      else if (cfg.paytoqs === "body") { paytobody = true; }

      let reqOpts = {};

      reqOpts.method = cfg.method

      reqOpts.timeout = { request: 120000 }

      if (RED.settings.httpRequestTimeout) { 
        reqOpts.timeout.request = parseInt(RED.settings.httpRequestTimeout) || 120000; 
      }

      if (msg.requestTimeout !== undefined) {
        if (isNaN(msg.requestTimeout)) {
          node.warn(RED._("node-red:httpin.errors.timeout-isnan"));
        } else if (msg.requestTimeout < 1) {
          node.warn(RED._("node-red:httpin.errors.timeout-isnegative"));
        } else {
          reqOpts.timeout = { request: msg.requestTimeout };
        }
      }

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


      if (cfg.method == 'GET' && typeof msg.payload !== "undefined" && paytoqs) {
        if (typeof msg.payload === "object") {
          try {
            if (opts.url.indexOf("?") !== -1) {
              opts.url += (opts.url.endsWith("?") ? "" : "&") + querystring.stringify(msg.payload);
            } else {
              opts.url += "?" + querystring.stringify(msg.payload);
            }
          } catch (err) {

            node.error(RED._("node-red:httpin.errors.invalid-payload"), msg);
            dne();
            return;
          }
        } else {
          node.error(RED._("httpin.errors.invalid-payload"), msg);
          dne();
          return;
        }
      } else if (cfg.method == "GET" && typeof msg.payload !== "undefined" && paytobody) {
        reqOpts.allowGetBody = true;
        if (typeof msg.payload === "object") {
          reqOpts.body = JSON.stringify(msg.payload);
        } else if (typeof msg.payload == "number") {
          reqOpts.body = msg.payload + "";
        } else if (typeof msg.payload === "string" || Buffer.isBuffer(msg.payload)) {
          reqOpts.body = msg.payload;
        }
      }

      if (cfg.method == 'POST' && typeof msg.payload !== "undefined") {
        reqOpts.body = ""
        let payload = undefined

        if (reqOpts.headers['content-type'] == 'multipart/form-data' && typeof msg.payload === "object") {
          let formData = new FormData();
          for (var opt in msg.payload) {
            if (msg.payload.hasOwnProperty(opt)) {
              var val = msg.payload[opt];
              if (val !== undefined && val !== null) {
                if (typeof val === 'string' || Buffer.isBuffer(val)) {
                  formData.append(opt, val);
                } else if (typeof val === 'object' && val.hasOwnProperty('value')) {
                  formData.append(opt, val.value, val.options || {});
                } else {
                  formData.append(opt, JSON.stringify(val));
                }
              }
            }
          }
          // GOT will only set the content-type header with the correct boundary
          // if the header isn't set. So we delete it here, for GOT to reset it.
          delete reqOpts.headers['content-type'];
          reqOpts.body = formData;
        } else {
          if (typeof msg.payload === "string" || Buffer.isBuffer(msg.payload)) {
            payload = msg.payload;
          } else if (typeof msg.payload == "number") {
            payload = msg.payload + "";
          } else {
            if (reqOpts.headers['content-type'] == 'application/x-www-form-urlencoded') {
              payload = querystring.stringify(msg.payload);
            } else {
              payload = JSON.stringify(msg.payload);
              if (reqOpts.headers['content-type'] == null) {
                reqOpts.headers[ctSet] = "application/json";
              }
            }
          }
          if (reqOpts.headers['content-length'] == null) {
            if (Buffer.isBuffer(payload)) {
              reqOpts.headers[clSet] = payload.length;
            } else {
              reqOpts.headers[clSet] = Buffer.byteLength(payload);
            }
          }
          reqOpts.body = payload;
        }
      }

      return got.stream(opts.url, reqOpts).on("downloadProgress", progressIndicator)
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
