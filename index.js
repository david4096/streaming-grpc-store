var grpc = require('grpc');
var SHA3 = require('sha3');

var config = require('./config');

var block_size = 4096; // The storage implements a binary tree that blocks
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
    getbases: getbases,
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
        storage[d.digest('hex')] = {raw_sequence_ids: leaves, length: bases.length};
    } else {
        
        storage[d.digest('hex')] = {bases: bases, length: bases.length};
    }
    //console.log(storage);
    return d.digest('hex');
}

function getsequence(raw_sequence_id) {
    var root = storage[raw_sequence_id];
    var buffer = "";
    //console.log(root);
    // This is where a database comes in handy
    // or bidirectional streams
    if (root == undefined){
        console.log('cache miss');
        return buffer;
    }
    else if ('raw_sequence_ids' in root && root.raw_sequence_ids) {
        //console.log("Reading leaves");
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

function get(call, callback) {
   // console.log(call);
  //  console.log(storage[call.request.raw_sequence_id])
  callback(null, storage[call.request.raw_sequence_id]);
  console.log("Number of keys: " + Object.keys(storage).length);
}

function store(call, callback) {
  var buffer = "";
  var d = new SHA3.SHA3Hash();
  call.on('data', function(msg) {
    var message = new service.RawSequenceStreamWriteRequest(msg);
    buffer += msg.bases;
    d.update(msg.bases);
  });
  call.on('end', function() {
    setTimeout(function(){
        storesequence(buffer);
    }, 1);
    var resp = {"raw_sequence_id": d.digest('hex')};
    //console.log(resp);
    callback(null, new service.RawSequenceStreamWriteResponse(resp));
  });
}

function getbases(call) {
    var buffer = getsequence(call.request.raw_sequence_id);
    while (buffer.length > block_size) {
        var sli = buffer.slice(0, block_size);
        var buffer = buffer.slice(block_size, buffer.length);
        call.write({"bases": sli});
    }
    call.write({"bases": buffer});
    call.end();
}

server.bind(config.grpc.host + ':' + config.grpc.port, grpc.ServerCredentials.createInsecure());
server.start();
