//Need to npm install apollo-server

/*
const { ApolloServer }= require(' insert location-of-apollo-server file '); 
const { MONGODB } = require('./config.js') //We connected to MongoDB with the config file
const mongoose = require('mongoose'); mongoose is a JavaScript library that connects MongoDB to Node.js
const typeDefs = require('./graphql/TypeDefs');
const resolvers = require('./graphql/resolvers');
*/



/* Below is a ApolloServer constructor:

from documentation: 
- Returns an initialized ApolloServer instance.
- Takes an options object as a parameter.
*/


/*
EXAMPLE 

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({req}) => ({ req })
});

*/


/*

mongoose
  .connect(MONGODB, { useNewUrlParser: true })
  .then(() => {
    console.log('MongoDB Connected');
    return server.listen({ port: 5000 });
  })
  .then((res) => {
    console.log(`Server running at ${res.url}`);
  });

*/

const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const typeDefs = require('./graphql/TypeDefs');
const resolvers = require('./graphql/resolvers');

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Set up WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    plugins: [{
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    }],
  });

  await server.start();
  server.applyMiddleware({ app });

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/imogine';
  
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err));

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`WebSocket server ready at ws://localhost:${PORT}${server.graphqlPath}`);
  });
}

// startServer();

module.exports = { startServer };