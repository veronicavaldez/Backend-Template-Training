const { gql } = require('apollo-server'); 

/* from graphQL documentation:

ex type def: 
type Character {
  name: String!
  appearsIn: [Episode!]!
}

The language is readable, but let’s go over it so that we can have a shared vocabulary:

    Character is a GraphQL Object type, meaning it’s a type with some fields. Most of the types in your schema will be Object types.
    name and appearsIn are fields on the Character type. That means that name and appearsIn are the only fields that can appear in any part of a GraphQL query that operates on the Character type.
    String is one of the built-in Scalar types. These are types that resolve to a single scalar value and can’t have sub-selections in the query. We’ll go over Scalar types more later.
    String! means that the field is a Non-Null type, meaning the GraphQL service promises to give you a value whenever you query this field. In SDL, we represent those with an exclamation mark.
    [Episode!]! represents an List type of Episode objects. When a List is Non-Null, you can always expect an array (with zero or more items) when you query the appearsIn field. In this case, since Episode! is also Non-Null within the list, you can always expect every item in the array to be an Episode object.

Now you know what a GraphQL Object type looks like and how to read the basics of SDL.

We must also define our queries and mutations.

If we have multiple queries or mutations, they will all be defined under said operation.

Ex:

 type Query{
        getArtist(name: String!): Artist
        getArtists: [Artist]
    }

    here, there are two queries defined for said web page, a getArtist, 
    which takes in a name and returns a "Artist Object"
    and a getArtists, which returns a list of artists.

*/

const TypeDefs = gql`

    #write your code here





`;

module.exports = TypeDefs;

