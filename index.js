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