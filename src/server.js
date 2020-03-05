import "dotenv/config";

import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import express from "express";
import { MongoClient } from "mongodb";

import { resolvers, typeDefs } from "./graphql/index";

const {
  PORT,
  PROTOCAL,
  HOST,
  DB_NAME,
  DB_USERNAME,
  DB_PASSWORD,
  DB_CLUSTERNAME
} = process.env;

const connect = async () => {
  const uri = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${DB_CLUSTERNAME}-5csrd.gcp.mongodb.net/test?retryWrites=true&w=majority`;
  const client = await MongoClient.connect(uri, { useNewUrlParser: true });

  const db = client.db(DB_NAME);
  console.log(`🗄 Connected to DB: ${DB_NAME}`);

  return db;
};

const runApp = db => {
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
    context: {
      db
    },
    playground: true,
    introspection: true
  });

  server.applyMiddleware({
    app,
    cors: false,
    path: "/"
  });

  return app;
};

const startServer = async () => {
  const db = await connect();
  const app = runApp(db);

  app.listen({ port: PORT || 4000 }, () => {
    console.log(`🚀 Apollo Server Ready on ${PROTOCAL}://${HOST}:${PORT}`);
  });
};

startServer();
