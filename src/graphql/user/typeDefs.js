const { gql } = require("apollo-server-core");

const typeDefs = gql`
  type User {
    fullName: String
    email: String!
    location: String
    age: String
    citizen: Boolean
  }

  input CreateUserInput {
    fullName: String
    email: String!
    location: String
    age: String
    citizen: Boolean
  }

  type Query {
    users: [User]
  }

  type Mutation {
    createUser(payload: CreateUserInput): User
  }
`;

module.exports = typeDefs;
