# Streaming

A set of Node-RED nodes for interacting with the [NodeJS stream API](https://nodejs.org/dist/latest-v18.x/docs/api/stream.html). 

**Proof of concept, Work in progress.**

This is not to be confused with Node-RED streaming: Node-RED is an event-driven streaming application with events being passed along wires. This streaming package aims to solve the handling *large* datasets using Node-RED.

## Screencasts

For an indepth explanation of these nodes, checkout the [screencasts](https://blog.openmindmap.org/blog/streaming).

## Message passing

Node-RED uses `msg` objects to pass data between flows. These objects get cloned when wires split or as an object is passed out of a node. Cloning of objects in Javascript is fine *provided* the objects are small. If these objects get to big, then Node-RED suffers. Memory gets bloated and things slow down.

[ETL](https://en.wikipedia.org/wiki/Extract%2C_transform%2C_load) pipelines on the other hand, work mostly with large datasets - gigabyte zip files are not unheard of. These datasets are fetched, stored and transformed before the data is passed to a data warehouse or some other data store. Hence ETL pipelines are not a good use-case for Node-RED. 

Added to that, Node-RED assumes data is completely available in memory, i.e., attached to the msg object and passed through flows. Many nodes work with Buffers stored in memory containing kilobytes of data.

This package attempts to provide a solution to dealing with large datasets within Node-RED. Central to this is providing methods for streaming data into Node-RED as individual msg objects. Large datasets are handled outside of the Node-RED flow mechanism, with only individual messages being sent into Node-RED for further handling. 

## NodeJS Stream API

To understand how these nodes work, a review of the basic ideas of the [Stream](https://nodejs.org/dist/latest-v18.x/docs/api/stream.html) API:

- Streams only deal with *chunks* of the original data: data is read in chunks and passed through streams until the chunk has been consumed. More chunks are passed through the streams as chunks get consumed.

- Streams come in three flavours: [Readable](https://nodejs.org/dist/latest-v18.x/docs/api/stream.html#class-streamreadable), [Transformer](https://nodejs.org/dist/latest-v18.x/docs/api/stream.html#duplex-and-transform-streams) and [Writable](https://nodejs.org/dist/latest-v18.x/docs/api/stream.html#class-streamwritable). Data is read into the stream by readers, altered by transformers and streamed out in chunks by writers.

- [Pipelines](https://nodejs.org/dist/latest-v18.x/docs/api/stream.html#streampipelinesource-transforms-destination-options) are the grouping of streams to describe an action to be performed on a dataset. A pipeline always takes the same basic structure: first comes the reader streams, then come the transformers (as many as needed) and finally the writers store away the data chunks.

Putting it all together: pipelines describe a collection of streams that modify data in chunks, never storing an entire dataset in memory. The advantage of the Stream API is being able to consume large datasets with *constant* memory usage. For example the difference between loading a 600mb file into memory versus reading 600mb in chunks of 65kb.

Not all formats allow streaming of data chunks, hence streaming does not work with all data formats and sometimes it is unavoidable to load entire datasets into memory.

## Node-RED and Stream API

Even though Node-RED is a streaming application, it has no "native" support for the NodeJS Stream API. Node-RED makes the assumption that data flows into Node-RED in small data chunks.

To support streaming large datasets through Node-RED, this package assumes this basic workflow:

- streaming download of web content directly to disk
- stream-reading of content from disk 
- transformation of stream content to single messages, messages are individually sent to Node-RED
- archive files are not streamed but first extracted and stored on disk. Individual files are then be streamed into Node-RED

This workflow is a basic requirement when creating ETL pipelines: data is stored before being worked on.

## Meta-Programming

These nodes are designed to be delimited by two nodes: PipeStart and PipeEnd. The Node-RED flow defined between these two nodes is a *meta* flow as the flow *describes* a stream [pipeline](https://nodejs.org/dist/latest-v18.x/docs/api/stream.html#streampipelinesource-transforms-destination-callback). 

Upon receiving the msg object, the PipeEnd node constructs and executes that pipeline - [code for that](https://github.com/gorenje/node-red-streaming/blob/fd161b2632ad081bfd2ab04f9a07b631e63f3f7e/nodes/pipeend.js#L17-L61). This implies that the msg objects goes through the flow twice: once for describing the pipeline and a second time for constructing the pipeline - the [createStream](https://github.com/gorenje/node-red-streaming/blob/fd161b2632ad081bfd2ab04f9a07b631e63f3f7e/nodes/pipeend.js#L22) function takes this msg as an argument.

Order within the flow is important so that reader-stream nodes *must* come before transformer nodes *must* come before writer nodes.

## Extending

**Work in Progress** this might change.

To create nodes that can be included in a pipeline setup requires that these nodes:

- Include themselves in the [`_streamPipeline` array](https://github.com/gorenje/node-red-streaming/blob/fd161b2632ad081bfd2ab04f9a07b631e63f3f7e/nodes/archivestream.js#L95-L98)
- Provide a [`createStream`](https://github.com/gorenje/node-red-streaming/blob/fd161b2632ad081bfd2ab04f9a07b631e63f3f7e/nodes/archivestream.js#L15-L79) function for defining streams.

That sounds simple and examples of this can be found:

- [LineStream](https://github.com/gorenje/node-red-streaming/blob/fd161b2632ad081bfd2ab04f9a07b631e63f3f7e/nodes/linestream.js#L42-L55) and here [LineStream](https://github.com/gorenje/node-red-streaming/blob/fd161b2632ad081bfd2ab04f9a07b631e63f3f7e/nodes/linestream.js#L66-L68)
- [FileStream](https://github.com/gorenje/node-red-streaming/blob/fd161b2632ad081bfd2ab04f9a07b631e63f3f7e/nodes/filestream.js#L14-L56) and here [FileStream](https://github.com/gorenje/node-red-streaming/blob/fd161b2632ad081bfd2ab04f9a07b631e63f3f7e/nodes/filestream.js#L72-L75)
- [DeCompStream](https://github.com/gorenje/node-red-streaming/blob/fd161b2632ad081bfd2ab04f9a07b631e63f3f7e/nodes/decompstream.js#L18-L51) and here [DeCompStream](https://github.com/gorenje/node-red-streaming/blob/fd161b2632ad081bfd2ab04f9a07b631e63f3f7e/nodes/decompstream.js#L62-L64)

Any third-party node can implement this functionality and these nodes can be then be used in conjunction with the existing nodes.

## Examples

An example ETL pipeline that uses these nodes is [available](https://flowhub.org/f/c520d9da20ad7f1d). This pipeline can also be viewed in [Node-RED](https://cdn.flowhub.org/?fhid=c520d9da20ad7f1d&t=0) (static, batteries not included).

## Contributing

Even though this codebase is maintained as a Node-RED [flow](https://flowhub.org/f/c620b688530123aa), contributions can be made using pull requests.

If you have an idea for a streaming node, then create it using the API described above and include it in your *own* package, there is no need to have third-party streaming nodes included here. A good naming convention would be `@scope/node-red-streaming-XXXX` but its not a requirement.

## TODOs

These are maintained on the flows own [homepage](https://flowhub.org/f/c620b688530123aa).

## Discussion

There is a discussion around these nodes on the [Node-RED forum](https://discourse.nodered.org/t/etl-pipelines-with-node-red/84347).

## License

[Do not do evil](/LICENSE).

## Artifacts

- [GitHub repo](https://github.com/gorenje/node-red-streaming)
- [Codebase a flow](https://flowhub.org/f/c620b688530123aa)
- [NPMjs package page](https://www.npmjs.com/package/@gregoriusrippenstein/node-red-streaming)
- [Node-RED package page](https://flows.nodered.org/node/@gregoriusrippenstein/node-red-streaming)

