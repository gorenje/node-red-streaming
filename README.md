# PipeStream

A set of streaming nodes to create streaming flows for Node-RED.

**Proof of concept, working in progress.**

## Streaming

The intention of this collection of nodes is to provide a method of setting up a streaming pipeline for ETL applications.

Since data source can get quite large, this set of nodes attempts to stream as much data passed Node-RED as is possible.

The basic workflow that these nodes support is:

- streaming download of web content directly to disk
- stream reading of content from disk along with transformation in the stream so that single messages are generated for the content.
- archive files are not streamed but first extracted and stored on disk. Individual files can then be streamed into Node-RED (as required)

A partially complete [flow](https://flowhub.org/f/c520d9da20ad7f1d) demonstrates how these nodes may be used.

## Meta-Programming

These nodes are designed to be encapsulated beween two nodes: PipeStart and PipeEnd. The flow defined between these two nodes are a *meta* flow because the flow *describes* a [pipeline](https://nodejs.org/dist/latest-v18.x/docs/api/stream.html#streampipelinesource-transforms-destination-callback) of streams that gets constructed and executed by the PipeEnd node.

Package [codebase](https://flowhub.org/f/c620b688530123aa) is in form a flow.

## Artifacts

- [GitHub repo](https://github.com/gorenje/node-red-contrib-pipestream)
- [Codebase a flow](https://flowhub.org/f/c620b688530123aa)
- [NPMjs package page](https://www.npmjs.com/package/@gregoriusrippenstein/node-red-contrib-pipestream)
- [Node-RED package page](https://flows.nodered.org/node/@gregoriusrippenstein/node-red-contrib-pipestream)

