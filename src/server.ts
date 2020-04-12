import "dotenv/config";

import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import express from "express";
import { MongoClient } from "mongodb";

import { Models, getModels, resolvers, typeDefs } from "./graphql/index";

const {
  PORT,
  PROTOCAL,
  HOST,
  DB_NAME,
  DB_USERNAME,
  DB_PASSWORD,
  DB_CLUSTERNAME
} = process.env;

// ----- DB connection -----
const connect = async () => {
  const uri = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${DB_CLUSTERNAME}-5csrd.gcp.mongodb.net/test?retryWrites=true&w=majority`;
  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const db = client.db(DB_NAME);
  console.log(`🗄  Connected to DB: ${DB_NAME}`);

  return db;
};

// ----- Express app and apollo server -----
export interface MyContext {
  models: Models;
}

const runApp = async () => {
  const db = await connect();
  const models = getModels(db);

  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );

  const context: MyContext = {
    models
  };

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context,
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

// ----- Start server -----
const startServer = async () => {
  const app = await runApp();

  app.listen({ port: PORT || 4000 }, () => {
    console.log(`🚀 Apollo Server Ready on ${PROTOCAL}://${HOST}:${PORT}`);
  });
};

startServer();
