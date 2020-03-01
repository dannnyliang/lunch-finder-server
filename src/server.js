import "dotenv/config";

import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import express from "express";

import { resolvers, typeDefs } from "./graphql/index";

const PORT = process.env.PORT;

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

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
