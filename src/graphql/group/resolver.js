import { ApolloError } from "apollo-server";
import { ObjectId } from "mongodb";
import { map, mergeDeepRight } from "ramda";

import { insertIdField, removeObjectIdField } from "../utils";

const getGroupsFindQuery = payload => {
  const query = {};
  if (payload.name) {
    query.name = new RegExp(payload.name);
  }
  if (payload.members) {
    query.members = { $in: [...payload.members] };
  }
  if (payload.options) {
    query.options = { $in: [...payload.options] };
  }
  return query;
};

const resolvers = {
  Group: {
    members: async (parent, variable, { db }) => {
      try {
        const memberIdList = parent.members;
        const members = await db
          .collection("users")
          .find({ _id: { $in: map(ObjectId, memberIdList) } })
          .toArray();

        return map(insertIdField, members);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    options: async (parent, variable, { db }) => {
      try {
        const optionIdList = parent.options;
        const options = await db
          .collection("restaurants")
          .find({ _id: { $in: map(ObjectId, optionIdList) } })
          .toArray();

        return map(insertIdField, options);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  },
  Query: {
    groups: async (parent, variables, { db }) => {
      try {
        const { query = {}, page = 1, limit = 10, sort = "_id" } = variables;

        const groups = await db
          .collection("groups")
          .find(getGroupsFindQuery(query))
          .sort({ [sort]: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        return {
          docs: map(insertIdField, groups),
          total: groups.length,
          page,
          limit
        };
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  },
  Mutation: {
    createGroup: async (_, variables, { db }) => {
      try {
        const { payload } = variables;
        const result = await db.collection("groups").insertOne(payload);

        return insertIdField(result.ops[0]);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    updateGroup: async (_, variables, { db }) => {
      try {
        const { id, payload } = variables;

        const originalDocument = await db
          .collection("groups")
          .find({ _id: ObjectId(id) })
          .toArray();

        const update = mergeDeepRight(
          removeObjectIdField(originalDocument[0]),
          payload
        );

        const newDocument = await db
          .collection("groups")
          .findOneAndUpdate(
            { _id: ObjectId(id) },
            { $set: update },
            { returnOriginal: false }
          );

        return insertIdField(newDocument.value);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    removeGroup: async (parent, variables, { db }) => {
      try {
        const { id } = variables;

        await db.collection("groups").findOneAndDelete({ _id: ObjectId(id) });

        return "Remove Completed!";
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  }
};

export default resolvers;
