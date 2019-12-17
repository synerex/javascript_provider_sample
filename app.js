const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const program = require('commander')

const Protobuf = require('protobufjs')
const descriptor = require('protobufjs/ext/descriptor');


const channel_RIDESHARE = 1; // should read from synerex_proto .

const api_path = __dirname +"/api/synerex.proto"

const nodeapi_path = __dirname + "/nodeapi/nodeapi.proto"

const fleet_path = __dirname + "/proto/fleet/fleet.proto"


program
    .version("1.0.0")
    .option("-s, --nodesrv [address]", "Node ID Server", "127.0.0.1:9990" )
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


const synerexApiDefinition = protoLoader.loadSync(
    api_path,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

const synerexApiProto = grpc.loadPackageDefinition(synerexApiDefinition);
const synerexApi = synerexApiProto.api

const fleetRoot = Protobuf.loadSync(fleet_path)

//console.log("Fleet",fleetRoot.lookup("Fleet"))

const Fleet = fleetRoot.lookup("Fleet")

function sendNotifySupply(client, node_id){
    // we need to encode protocol
    flt = Fleet.create(
        {
            coord:{lat:34.85,lon:137.15},
            vehicle_id: 1,
            angle: 160,
            speed: 280
        });

    console.log("Send Fleet Info",flt)

    var buffer = Fleet.encode(flt).finish()    
    sp = {
        id: 0,  // should use snowflake id..
        sendr_id: node_id,
        channel_type: channel_RIDESHARE,
        supply_name: "RS Notify",
        arg_json: "",
        cdata:{ entity: buffer }
    };

    client.NotifySupply(sp, 
        (err,resp)=>{
            if (!err) {
                console.log("Sent OK", resp)
            }else{
                console.log("error",err)
            }
        });

}

function subscribeDemand(client, node_id){
    var ch= {
        client_id: node_id,
        channel_type: channel_RIDESHARE,
        arg_json: "Test..."
    }

    var call = client.SubscribeSupply(ch)

    call.on('data', function(supply){
        console.log("receive Supply:",supply);
//        console.log("CDATA:",supply.cdata.entity);
        flt = Fleet.decode(supply.cdata.entity);
        console.log(flt)
    });
    call.on('status', function(st){
        console.log("Subscribe Status",st);        
    })


    call.on('end', function(){
        console.log("Subscribe Done!");   
    })
}



function connectSynerexServer(resp){
    
    console.log("Connecting synerex Server ", resp.server_info );
    const sClient = new synerexApi.Synerex(resp.server_info, grpc.credentials.createInsecure());

    sendNotifySupply(sClient, resp.node_id);

    console.log("Subscribe RIDE_SHARE Channel");

   subscribeDemand(sClient, resp.node_id);
    

}



/// main.

console.log("Connecting nodeserv ",program.nodesrv)
const nodesvClient = new nodeapi.Node(program.nodesrv, grpc.credentials.createInsecure());

const NodeType = Protobuf.Enum.fromDescriptor(nodeapi.NodeType.type)
//console.log("NodeType", NodeType.values.PROVIDER)


nodesvClient.RegisterNode(
    {
        node_name: program.hostname,
        node_type: NodeType.values.PROVIDER,
        channelTypes: [channel_RIDESHARE],   // RIDE_SHARE        
    },
     (err, resp) =>{
         if (!err){
             console.log("NodeServer connect success!")
             console.log(resp)
             console.log("Node ID is ",resp.node_id)
             console.log("Server Info is ",resp.server_info)
             console.log("KeepAlive is ",resp.keepalive_duration)

            connectSynerexServer(resp)

         }else{
             console.log("Error connecting NodeServ.");
             console.log(err)
         }
});







