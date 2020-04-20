import { ApolloError } from "apollo-server";
import { ObjectId } from "mongodb";
import { map, mergeDeepRight } from "ramda";

import {
  Maybe,
  MutationResolvers,
  QueryResolvers,
  UpdateUserInput,
  User,
  UserResolvers,
  UsersQuery
} from "../../generated/types";
import {
  getObjectIdFromString,
  insertIdField,
  removeObjectIdField
} from "../utils";

interface UsersFindQuery {
  name?: RegExp;
  favorite?: { $in: ObjectId[] };
}

const getUsersFindQuery = (payload: UsersQuery) => {
  const query: UsersFindQuery = {};
  if (payload.name) {
    query.name = new RegExp(payload.name);
  }
  if (payload.favorite) {
    query.favorite = { $in: map(getObjectIdFromString, payload.favorite) };
  }
  return query;
};

interface Resolver {
  User: UserResolvers;
  Query: QueryResolvers;
  Mutation: MutationResolvers;
}

const resolvers: Resolver = {
  User: {
    favorite: async (user, variable, { models: { Restaurants } }) => {
      try {
        // @ts-ignore: UserMapper overwrite User parent type
        const restaurantIdList = user.favorite as Maybe<string[]>;
        const restaurants = await Restaurants.find({
          _id: { $in: map(getObjectIdFromString, restaurantIdList || []) }
        }).toArray();

        return map(insertIdField, restaurants);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  },
  Query: {
    users: async (parent, variables, { models: { Users } }) => {
      try {
        const { query = {}, page = 1, limit = 10, sort = "_id" } = variables;

        const users = await Users.find(getUsersFindQuery(query))
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
    createUser: async (_, variables, { models: { Users } }) => {
      try {
        const { payload } = variables;
        const result = await Users.insertOne(payload);

        return insertIdField(result.ops[0]);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    updateUser: async (_, variables, { models: { Users } }) => {
      try {
        const { id, payload } = variables;

        const originalDocument = await Users.find({
          _id: new ObjectId(id)
        }).toArray();

        const update = mergeDeepRight<User, UpdateUserInput>(
          removeObjectIdField(originalDocument[0]),
          payload
        );

        const newDocument = await Users.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: update },
          { returnOriginal: false }
        );

        return insertIdField(newDocument.value);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    removeUser: async (parent, variables, { models: { Users } }) => {
      try {
        const { id } = variables;

        await Users.findOneAndDelete({ _id: new ObjectId(id) });

        return "Remove Completed!";
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  }
};

export default resolvers;
