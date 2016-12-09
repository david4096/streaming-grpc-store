var grpc = require('grpc');
var SHA3 = require('sha3');

var config = require('./config');

var service = grpc.load({root: '.', file: 'grpc.proto'}).streaming_grpc_store;
var server = new grpc.Server();

server.addProtoService(service.Store.service, 
{
    store: store,
    retrieveone: retrieveone
});

function getkey(serialized){
  // Generate 512-bit digest.
  var d = new SHA3.SHA3Hash();
  console.log(serialized);
  d.update(serialized);
  return d.digest('hex');
}

var storage = {};

function store(call, callback) {
  var keys = [];
  call.on('data', function(msg) {
    var k = service.StoreMessage(msg);
    var key = getkey(service.StoreMessage.encode(msg).finish());
    storage[key] = service.StoreMessage.encode(msg).finish();
    keys.push({key: key});
  });
  call.on('end', function() {
    callback(null, {
        keys: keys
    });
  });
}

function retrieveone(call, callback) {
    console.log(call.request.key)
    console.log(storage[call.request.key]);
    var k = service.StoreMessage
    callback(null, storage[call.request.key]);
}

server.bind(config.grpc.host + ':' + config.grpc.port, grpc.ServerCredentials.createInsecure());
server.start();
