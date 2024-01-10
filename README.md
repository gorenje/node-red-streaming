# PipeStream

A set of streaming nodes to create streaming flows for Node-RED.

Proof of concept, working in progress.

## Meta-Programming

These nodes are designed to be encapsulated beween two nodes: PipeStart and PipeEnd. The flow defined between these two nodes are a *meta* flow because the flow *describes* a [pipeline](https://nodejs.org/dist/latest-v18.x/docs/api/stream.html#streampipelinesource-transforms-destination-callback) of streams that gets constructed and executed by the PipeEnd node.

[Examples and codebase](https://flowhub.org/f/c620b688530123aa).
