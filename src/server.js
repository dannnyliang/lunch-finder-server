import "dotenv/config";

import { ApolloServer } from "apollo-server-express";
import express from "express";
import resolvers from "./graphql/user/resolver";
import typeDefs from "./graphql/user/typeDefs";

const PORT = process.env.PORT;

const app = express();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: true,
  introspection: true
});

server.applyMiddleware({
  app,
  cors: false,
  path: "/"
});

app.listen({ port: PORT || 4000 }, () => {
  console.log(`🚀 Server ready on port: ${PORT}`);
});
