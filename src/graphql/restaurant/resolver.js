import { ApolloError } from "apollo-server";
import { ObjectId } from "mongodb";
import { map, mergeDeepRight } from "ramda";

import { insertIdField, removeObjectIdField } from "../utils";

const getRestaurantsFindQuery = payload => {
  const query = {};
  if (payload.name) {
    query.name = new RegExp(payload.name);
  }
  if (payload.address) {
    query.address = new RegExp(payload.address);
  }
  if (payload.averagePrice) {
    query.averagePrice = { $gte: payload.averagePrice };
  }
  return query;
};

const resolvers = {
  Query: {
    restaurants: async (parent, variables, { db }) => {
      try {
        const { query = {}, page = 1, limit = 10, sort = "_id" } = variables;

        const restaurants = await db
          .collection("restaurants")
          .find(getRestaurantsFindQuery(query))
          .sort({ [sort]: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        return {
          docs: map(insertIdField, restaurants),
          total: restaurants.length,
          page,
          limit
        };
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  },
  Mutation: {
    createRestaurant: async (_, variables, { db }) => {
      try {
        const { payload } = variables;
        const result = await db.collection("restaurants").insertOne(payload);

        return insertIdField(result.ops[0]);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    updateRestaurant: async (_, variables, { db }) => {
      try {
        const { id, payload } = variables;

        const originalDocument = await db
          .collection("restaurants")
          .find({ _id: ObjectId(id) })
          .toArray();

        const update = mergeDeepRight(
          removeObjectIdField(originalDocument[0]),
          payload
        );

        const newDocument = await db
          .collection("restaurants")
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
    removeRestaurant: async (parent, variables, { db }) => {
      try {
        const { id } = variables;

        await db
          .collection("restaurants")
          .findOneAndDelete({ _id: ObjectId(id) });

        return "Remove Completed!";
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  }
};

export default resolvers;
