const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const program = require('commander')

const Protobuf = require('protobufjs')
const descriptor = require("protobufjs/ext/descriptor");

//const api_path = __dirname +"/api/synerex.proto"

const nodeapi_path = __dirname + "/nodeapi/nodeapi.proto"

program
    .version("1.0.0")
    .option("-s, --nodesrv [address]", "Node ID Server", "127.0.0.1:10000" )
    .option("-n, --hostname [name]", "Hostname for provider", "NodeJS_Sample")
    .parse(process.argv)

const nodeApiDefinition = protoLoader.loadSync(
    nodeapi_path,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

const nodeApiProto = grpc.loadPackageDefinition(nodeApiDefinition);
const nodeapi = nodeApiProto.nodeapi

console.log("Connectiong nodeserv ",program.nodesrv)
const nodesvClient = new nodeapi.Node(program.nodesrv, grpc.credentials.createInsecure());

console.log("NodeAPI", nodeapi)

console.log("NodeClient", nodesvClient)

//console.log("NodeType", nodeapi.NodeType.type)

const NodeType = Protobuf.Enum.fromDescriptor(nodeapi.NodeType.type)
//console.log("NodeType", NodeType)



nodesvClient.RegisterNode(
    {
        node_name: program.hostname,
        node_type: NodeType.PROVIDER,
        channelTypes: [1],   // RIDE_SHARE        
    },
     (err, resp) =>{
         if (!err){
             console.log("NodeServer connect success!")
             console.log(resp)
             console.log("Node ID is ",resp.node_id)
             console.log("Server Info is ",resp.server_info)
             console.log("KeepAlive is ",resp.keepalive_duration)
         }else{
             console.log("Error connecting NodeServ.");
             console.log(err)
         }
});

