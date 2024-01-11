module.exports = async function(RED) {

  const { pipeline } = await import('node:stream/promises')
  
  function CorePipeEndFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.on('close', function() {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", async function(msg, send, done) {
        try {
          let streams = []

          msg._streamPipeline.forEach( ( ndedef ) => {
            let nde = RED.nodes.getNode(ndedef.id )
            let strm = nde.createStream(ndedef, msg, send, done, nde)
            if ( !strm ) {
              msg.source_id = nde.id
              done( "no stream found for NodeId: " + nde._def.type, msg)
              return
            }
            streams = streams.concat( Array.isArray(strm) ? strm : [strm])
          })
          
          pipeline(
            streams
          ).then( (result) => {
            let m = RED.util.cloneMessage(msg);

            // if this is used as part of a group of pipes, then don't send
            // complete rather we assume there is a join collecting messages
            // together and 'complete' is a flag for a join node.
            if ( !m.hasOwnProperty("parts") ) {
              m.complete = true
            }
            m.piperesult = result

            setTimeout(() => { node.status({ fill: "green", shape: "dot", text: "done" }) }, 2000)
            setTimeout(() => { node.status({}) }, 4000)

            send(m)
            done()
          }).catch( (err) => {
            console.error("pipe end error", err)
            var m = RED.util.cloneMessage(msg);
            m.err = err
            done(m.err.message, m)
          })

        } catch (err) {
          // use done if the node won't send anymore messages for the
          // message it received.
          msg.error = err
          done(err.message, msg)
        }
    });
  }

  RED.nodes.registerType("PipeEnd", CorePipeEndFunctionality);

}
