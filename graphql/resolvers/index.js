/*

# 
the code below will be changed to whichever name your type is, but the structure will stay the same!
Ex:

const artistsResolvers = require('./artists');

module.exports = artistsResolvers;

if you have multiple types, it might look a little more like the following:

const postsResolvers = require('./posts');
const usersResolvers = require('./users');
const commentsResolvers = require('./comments')

module.exports = {
    Post: {
        likeCount: (parent) => parent.likes.length,
        commentCount: (parent) => parent.comments.length
      },
    Query: {

        ...postsResolvers.Query
    },
    Mutation: {
        ...usersResolvers.Mutation,
        ...postsResolvers.Mutation,
        ...commentsResolvers.Mutation
    }

};
*/
