var grpc = require('grpc');
var config = require('./config.js');

var service = grpc.load({root: '.', file: 'write.proto'}).sequence_store;

var credentials = grpc.credentials.createInsecure();

var client = new service.RawSequenceStore(config.grpc.host + ':' + config.grpc.port, credentials);

var started_writing = Date.now();

function makeid(length)
{
    var text = "";
    var possible = "ATGC";

    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function getsequence(raw_sequence_id, callback) {
    client.get({"raw_sequence_id": raw_sequence_id}, function(err, res) {
        var root = res;
        var buffer = "";
        //console.log(root);
        if (root.raw_sequence_ids) {
            //console.log("Reading leaves");
            root.raw_sequence_ids.forEach(function(rsid) {
            // race conditions here
                getsequence(rsid, function(nerr, nres){
                    buffer += nres;
                });
            });
        } else {
            buffer += root.bases;
        }
        // console.log('get sequence buffer')
        // console.log(buffer);
        callback(buffer);
    })

}
var gotten = [];
var requested = 0;
var start = Date.now();
    setInterval(function() {
    
    var call = client.store(function(err, res) {
        var started_reading = Date.now();
        var time_to_store = started_reading - done_writing;
        var root = res.raw_sequence_id;
        //console.log('Time to store: ' + (started_reading - done_writing) + " " + root)
        var c = client.getbases({"raw_sequence_id": res.raw_sequence_id});
        var buffer = "";
        var bufferl = 0;
        
        c.on('data', function(msg){
            //buffer += msg.bases;
            bufferl += msg.bases.length;
        });
        c.on('end', function(err, res){
            //console.log(buffer);
            //console.log("Stored sequence of length: " + bufferl);
            var done_reading = Date.now();
            var diff = done_reading - started_reading;
            //console.log("Time to read: " + diff + " " + root);
            //console.log("Time to read per base: " + diff / bufferl + " " + root);
            //console.log("Time to store: " + time_to_store + " " + root);
            //console.log("Time to store per base: " + time_to_store / bufferl + " " + root);
            client.get({"raw_sequence_id": root}, function(err, res) {
                var time_to_get = Date.now();
                //console.log("Time to get: " + (time_to_get - done_reading) + " " + root);
                gotten.push(res);
                //console.log(res);
                        // now try recursively reading with client
                //getsequence(root, function(res){
                //    console.log('time to rebuild: ' + (Date.now() - time_to_get));
                //    console.log("rebuild buffer");
                //    console.log(res.length);
                //})
                console.log("Number of sequences added " + gotten.length);
                var total_bases = gotten.reduce(function(cur, prev) { 
                    return Number(prev.length) + cur;}, 0);
                console.log("Number of base pairs added " + total_bases + " " + Math.floor(total_bases / 1000000) + "Mb");
                    console.log("Total time: " + (Date.now() - start));
                    console.log("Mb/s: " + (Date.now() - start) / total_bases)
                    console.log("Open: " + (requested - gotten.length))
            });
        });
    });

    requested += 1;
        //for (var i = 0; i < Math.floor(Math.random() * 100); i++) {
            // simulating short reads
            call.write({"bases": makeid(Math.floor(Math.random()*15555))});
        //}

        call.end();
        var done_writing = Date.now();
        //console.log("Time to write: " + (done_writing - started_writing));
    }, 10);
