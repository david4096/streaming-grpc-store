var grpc = require('grpc');
var SHA3 = require('sha3');

var config = require('./config');

var block_size = 512; // The storage implements a binary tree that blocks
                      // sequence in increments of this maximum length.
                      //
                      // Choosing a biologically relevant number will
                      // naturally create raw sequence records for biological
                      // sequences.
                      //
                      // Choosing a modulus block size with relevant biological
                      // magic numbers will further improve the quality of
                      // the index. For example, if the sequence evenly has
                      // a modulus of three one may desire to represent each
                      // word individually.

var service = grpc.load({root: '.', file: 'write.proto'}).sequence_store;
var server = new grpc.Server();

server.addProtoService(service.RawSequenceStore.service, 
{
    store: store,
    get: get
});

function getkey(serialized){
  // Generate 512-bit digest.
  var d = new SHA3.SHA3Hash();
  console.log(serialized);
  d.update(serialized);
  return d.digest('hex');
}

function storesequence(bases) {
    var leaves = [];
    if (bases.length > block_size) {
        leaves = [storesequence(bases.slice(0, bases.length / 2)), 
        storesequence(bases.slice(bases.length / 2, bases.length))];
    }
    var d = new SHA3.SHA3Hash();
    d.update(bases);
    if (leaves.length > 0) {
        storage[d.digest('hex')] = {raw_sequence_ids: leaves};
    } else {
        storage[d.digest('hex')] = {bases: bases};
    }
    console.log(storage);
    return d.digest('hex');
}

function getsequence(raw_sequence_id) {
    var root = storage[raw_sequence_id];
    var buffer = "";
    console.log(root);
    if (root.raw_sequence_ids) {
        console.log("Reading leaves");
        root.raw_sequence_ids.forEach(function(rsid) {
            buffer += getsequence(rsid);
        });
    } else {
        buffer += root.bases;
    }
    // console.log('get sequence buffer')
    // console.log(buffer);
    return buffer;
}

var storage = {};

function store(call, callback) {
  var buffer = "";
  var d = new SHA3.SHA3Hash();
  call.on('data', function(msg) {
    var message = new service.RawSequenceStreamWriteRequest(msg);
    buffer += msg.bases;
    //d.update(msg.bases);
  });
  call.on('end', function() {
    var resp = {"raw_sequence_id": storesequence(buffer)};
    console.log(resp);
    callback(null, new service.RawSequenceStreamWriteResponse(resp));
  });
}

function get(call) {
    call.write({"bases": getsequence(call.request.raw_sequence_id)})
    call.end();
}

server.bind(config.grpc.host + ':' + config.grpc.port, grpc.ServerCredentials.createInsecure());
server.start();
