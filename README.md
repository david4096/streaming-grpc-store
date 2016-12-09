# streaming grpc store

    service Store {
      // The Store service presents a method for storing a message.
      // When a stream of messages has ended, it returns a StoreResponse.
      rpc store(stream StoreMessage) returns (StoreResponse) {}
      rpc retrieveone(Key) returns (StoreMessage) {}
    }


Use grpc to create a simple key value store that allows one
to send protobuf messages and expect them to be returned.

It allows one to stream in data to be stored. When the stream
ends the client receives a list of stored keys.

The actual storage is simply a JavaScript Object in memory.

To run, try `npm install` to get the grpc and a hashing library.

Then run `node index.js` to start the server.

`node client.js` will stream in some messages and then retrieve
the keys it created one by one.
