import { ApolloError } from "apollo-server";
import { evolve, map, mergeDeepRight } from "ramda";

import {
  Group,
  GroupQuery,
  GroupResolvers,
  MutationResolvers,
  QueryResolvers,
  UpdateGroupInput
} from "../../generated/types";
import {
  getObjectIdFromString,
  insertIdField,
  removeObjectIdField
} from "../utils";

interface GroupsFindQuery {
  name?: RegExp;
  members?: { $in: string[] };
  options?: { $in: string[] };
}

const getGroupsFindQuery = (payload: GroupQuery) => {
  const query: GroupsFindQuery = {};
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

interface Resolver {
  Group: GroupResolvers;
  Query: QueryResolvers;
  Mutation: MutationResolvers;
}

const resolvers: Resolver = {
  Group: {
    members: async (parent, _, { db }) => {
      try {
        const memberIdList = parent.members;
        console.log(memberIdList && typeof memberIdList[0]);
        const members = await db
          .collection("users")
          .find({
            _id: {
              $in: map(
                member => getObjectIdFromString(member.id),
                memberIdList || []
              )
            }
          })
          .toArray();

        return map(insertIdField, members);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    options: async (parent, _, { db }) => {
      try {
        const optionIdList = parent.options;
        const options = await db
          .collection("restaurants")
          .find({
            _id: {
              $in: map(
                option => getObjectIdFromString(option.id),
                optionIdList || []
              )
            }
          })
          .toArray();

        return map(insertIdField, options);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  },
  Query: {
    groups: async (_, variables, { db }) => {
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
          .find({ _id: getObjectIdFromString(id) })
          .toArray();

        const update = mergeDeepRight<Group, UpdateGroupInput>(
          removeObjectIdField(originalDocument[0]),
          payload
        );

        const newDocument = await db
          .collection("groups")
          .findOneAndUpdate(
            { _id: getObjectIdFromString(id) },
            { $set: update },
            { returnOriginal: false }
          );

        if (!newDocument.value) {
          throw Error();
        }

        return insertIdField(newDocument.value);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    removeGroup: async (_, variables, { db }) => {
      try {
        const { id } = variables;

        await db
          .collection("groups")
          .findOneAndDelete({ _id: getObjectIdFromString(id) });

        return "Remove Completed!";
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  }
};

export default resolvers;
