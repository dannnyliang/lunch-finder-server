import { ApolloError } from "apollo-server";
import { map, mergeDeepRight } from "ramda";

import { insertIdField, removeObjectIdField } from "../utils";

const getUsersFindQuery = payload => {
  let query = {};
  if (payload.name) {
    query.name = new RegExp(payload.name);
  }
  if (payload.favorite) {
    query.favorite = { $in: [...payload.favorite] };
  }
  return query;
};

const resolvers = {
  Query: {
    users: async (parent, variables, { db }) => {
      try {
        const { query, page = 1, limit = 10, sort = "_id" } = variables;

        const users = await db
          .collection("users")
          .find(getUsersFindQuery(query))
          .sort({ [sort]: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        return {
          docs: map(insertIdField, users),
          total: users.length,
          page,
          limit
        };
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  },
  Mutation: {
    createUser: async (_, variables, { db }) => {
      try {
        const { payload } = variables;
        const result = await db.collection("users").insertOne(payload);

        return insertIdField(result.ops[0]);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    updateUser: async (_, variables, { db }) => {
      try {
        const { id, payload } = variables;

        const originalDocument = await db
          .collection("users")
          .find({ _id: id })
          .toArray();

        const update = mergeDeepRight(
          removeObjectIdField(originalDocument[0]),
          payload
        );

        const newDocument = await db
          .collection("users")
          .findOneAndUpdate(
            { _id: id },
            { $set: update },
            { returnOriginal: false }
          );

        return insertIdField(newDocument.value);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    removeUser: async (parent, variables, { db }) => {
      try {
        const { id } = variables;

        await db.collection("users").findOneAndDelete({ _id: id });

        return "Remove Completed!";
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  }
};

export default resolvers;
