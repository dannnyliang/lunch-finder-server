import { ApolloServer } from "apollo-server";
import { createTestClient } from "apollo-server-testing";
import { Db, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";

import { getModels, resolvers, typeDefs } from "../graphql";

export const createTestServer = () => {
  let connection: MongoClient;
  let mongoServer: MongoMemoryServer;
  let db: Db;

  const connect = async () => {
    mongoServer = new MongoMemoryServer();
    const mongoUri = await mongoServer.getConnectionString();
    connection = await MongoClient.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    db = connection.db(await mongoServer.getDbName());
  };

  const tearDown = async () => {
    if (connection) await connection.close();
    if (mongoServer) await mongoServer.stop();
  };

  const createServer = () => {
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: {
        models: getModels(db)
      }
    });

    const testClient = createTestClient(server);
    return { testClient, models: getModels(db) };
  };

  return { connect, tearDown, createServer };
};
