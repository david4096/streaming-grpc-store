var grpc = require('grpc');
var config = require('./config.js');

var service = grpc.load({root: '.', file: 'write.proto'}).sequence_store;

var credentials = grpc.credentials.createInsecure();

var client = new service.RawSequenceStore(config.grpc.host + ':' + config.grpc.port, credentials);

var started_writing = Date.now();

var call = client.store(function(err, res) {
    console.log(res);
    console.log(err);
    var started_reading = Date.now();
    var c = client.get({"raw_sequence_id": res.raw_sequence_id});
    var buffer = "";
    c.on('data', function(msg){
        buffer += msg.bases;
        console.log(buffer.length);
    });
    c.on('end', function(err, res){
        console.log(buffer);
        console.log(buffer.length);
        var done_reading = Date.now();
        var diff = done_reading - started_reading;
        console.log("Done reading :" + diff);
        console.log("Time per base: " + diff / buffer.length )
    });
});

for (var i = 0; i < 100; i++) {
    call.write({"bases": "ATGCCTGATACATAGATACA---" + i});
}

call.end();
var done_writing = Date.now();
console.log(done_writing);
console.log("Time to write: " + (done_writing - started_writing))
