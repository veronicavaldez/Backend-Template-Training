# SHPE UF SWE Team Training Backend Template

![alt text](https://shpeuf.s3.amazonaws.com/public/misc/logo_horizontal.png "SHPE logo")

Congrats one more time on being selected as prospective software developer directors! (Sweenies) In this repository, you will find a template that you would want to use to build the backend functionality of your training project. 

## Why This Template?

This template should function as a building foundation for the backend of your project. In it, you will find how your web app should be structured, although it is not completely necessary, I truly recommend following this structure as it very closely mimics the way our own server is structured (plus it makes your JPM work easier) and will yield you better results once you are integraded into the team.

Every file has it's own section in the readME(See navigation below) explaining its purpose and role in the proper function of your website. Each file in the repository also includes several commented out examples and explanations that you can follow to adjust it to your preferences and choice of theme/topic/info used.

## Getting Started

Before starting out, we must first take care of a couple of things. 

If you haven't already, make sure you install the latest version of node.js, link: https://nodejs.org/en



create our database! For this project, we will be using mongodb to store information from and to our server, as it is what we currently use to store all of SHPE UF's info from our website!

I have created a short tutorial video to show how to set up mongoDB for this project: 

## Navigation

### index.js ###

The index.js file is the entry point of your backend application. It brings together all the key components of your GraphQL server, connects to your MongoDB database, and starts the server.

**Purpose:**

* Set Up the Apollo Server: This file configures and initializes the Apollo Server, which handles GraphQL queries, mutations, and subscriptions.

* Connect to MongoDB: It establishes a connection to the MongoDB database using Mongoose.

* Start the Server: Once the database is successfully connected, the server starts and listens for incoming requests on the specified port.

**ApolloServer documentation:** https://www.apollographql.com/docs/apollo-server/api/apollo-server

**Mongoose docs:** https://mongoosejs.com/docs/connections.html

### config.js ###
This file is used to connect to the mongodb. not much to see here. watch video!

### models folder

#### TypeName.js

The files in the model folder look extremely similar to the definitions already established on TypeDefs.js, so this part is pretty straightforward.

This defines the database schema using Mongoose (for MongoDB).
It specifies how data is stored and managed in MongoDB.

Example: 

```
const { model, Schema } = require('mongoose');

const artistSchema = new Schema({
    name: String,
    genre: String
});

module.exports = model('Artist', artistSchema);
```

### graphql folder

#### -TypeDefs.js

The TypeDefs.js file defines the GraphQL schema for your backend. This file is where you specify the structure of the data that can be queried or mutated through your API.

The most basic components of a GraphQL schema are Object types,  which just represent a kind of object you can fetch from your service, and what fields it has. In SDL, we represent it like this:

```
type User {
  id: ID!
  name: String
}

type Query {
  user(id: ID!): User
}
```

### resolvers 

If you want a more comprehensive tutorial or you like learning by doing before starting, check out this tutorial! https://www.apollographql.com/tutorials/lift-off-part2?referrer=docs-content

In this template only one resolver (and type) is used. If you are using more than one type, for example, posts, users & comments, you will have to add the correspondent files manually.

#### -index.js

This index.js file inside the resolvers serves to export each individual resolver file.

#### -typename.js

"typename" is a placeholder for the name of your type. It is good practice to name this file the same as what is on your TypeDefs & Schema. 

This is one of the most important files as here is where you will be adding functionality/definitions to your queries and mutations.
