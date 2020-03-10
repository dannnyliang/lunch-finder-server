import { ApolloError } from "apollo-server";
import { ObjectId } from "mongodb";
import { has, map, mergeDeepRight } from "ramda";

import { insertIdField, removeObjectIdField } from "../utils";

const POLL_STATUS = {
  POLLING: "POLLING",
  COMPLETED: "COMPLETED",
  ABANDONED: "ABANDONED"
};

const getPollsFindQuery = payload => {
  const query = {};
  if (payload.name) {
    query.name = new RegExp(payload.name);
  }
  if (payload.status) {
    query.status = payload.status;
  }
  if (payload.decision) {
    query.decision = payload.decision;
  }
  if (has("isTimeLimit", payload)) {
    query.limitTime = payload.isTimeLimit ? { $ne: null } : { $eq: null };
  }
  if (has("isDecided", payload)) {
    query.decision = payload.isDecided ? { $ne: null } : { $eq: null };
  }
  return query;
};

const setFieldDefaultValue = payload =>
  mergeDeepRight(
    {
      status: POLL_STATUS.POLLING,
      startTime: new Date()
    },
    payload
  );

const resolvers = {
  Poll: {
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
    },
    decision: async (parent, variable, { db }) => {
      try {
        const decision = await db
          .collection("restaurants")
          .findOne({ _id: parent.decision });

        return decision ? insertIdField(decision) : null;
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  },
  Query: {
    polls: async (parent, variables, { db }) => {
      try {
        const { query = {}, page = 1, limit = 10, sort = "_id" } = variables;

        const polls = await db
          .collection("polls")
          .find(getPollsFindQuery(query))
          .sort({ [sort]: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        return {
          docs: map(insertIdField, polls),
          total: polls.length,
          page,
          limit
        };
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    poll: async (parent, variables, { db }) => {
      try {
        const { id } = variables;

        const poll = await db
          .collection("polls")
          .findOne({ _id: ObjectId(id) });

        return insertIdField(poll);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  },
  Mutation: {
    createPoll: async (_, variables, { db }) => {
      try {
        const { payload } = variables;
        const newDocument = setFieldDefaultValue(payload);
        const result = await db.collection("polls").insertOne(newDocument);

        return insertIdField(result.ops[0]);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    updatePoll: async (_, variables, { db }) => {
      try {
        const { id, payload } = variables;

        const originalDocument = await db
          .collection("polls")
          .find({ _id: ObjectId(id) })
          .toArray();

        const update = mergeDeepRight(
          removeObjectIdField(originalDocument[0]),
          payload
        );

        const newDocument = await db
          .collection("polls")
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
    removePoll: async (parent, variables, { db }) => {
      try {
        const { id } = variables;

        await db.collection("polls").findOneAndDelete({ _id: ObjectId(id) });

        return "Remove Completed!";
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  }
};

export default resolvers;
