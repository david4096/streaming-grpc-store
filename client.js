var grpc = require('grpc');
var config = require('./config.js');

var service = grpc.load({root: '.', file: 'grpc.proto'}).streaming_grpc_store;

var credentials = grpc.credentials.createInsecure();

var client = new service.Store(config.grpc.host + ':' + config.grpc.port, credentials);

var call = client.store(function(err, res) {
    for (var i in res.keys) {
        var innercall = client.retrieveone({key: res.keys[i].key}, function(err, res) {
            console.log(res)
        })
    }
});

for (var i = 0; i < 100; i++) {
    call.write({my_type: {msg: 'hi ' + i}});
}

call.end();
