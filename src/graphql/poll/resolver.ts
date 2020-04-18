import { ApolloError, UserInputError } from "apollo-server";
import { ObjectId } from "mongodb";
import {
  has,
  includes,
  isEmpty,
  isNil,
  map,
  mergeDeepRight,
  reduce
} from "ramda";

import {
  CreatePollInput,
  MutationResolvers,
  OpinionDbObject,
  Poll,
  PollDbObject,
  PollResolvers,
  PollStatus,
  PollsQuery,
  QueryResolvers,
  UpdatePollInput
} from "../../generated/types";
import { OpinionMapper } from "../mapperTypes";
import {
  getObjectIdFromString,
  insertIdField,
  removeObjectIdField
} from "../utils";

const POLL_STATUS = {
  POLLING: "POLLING",
  COMPLETED: "COMPLETED",
  ABANDONED: "ABANDONED"
};

interface PollsFindQuery {
  name?: RegExp;
  status?: PollStatus;
  result?: ObjectId;
  limitTime?: { $ne: null } | { $eq: null };
}

const getPollsFindQuery = (payload: PollsQuery) => {
  const query: PollsFindQuery = {};
  if (payload.name) {
    query.name = new RegExp(payload.name);
  }
  if (payload.status) {
    query.status = payload.status;
  }
  if (payload.result) {
    query.result = getObjectIdFromString(payload.result);
  }
  if (has("isTimeLimit", payload)) {
    query.limitTime = payload.isTimeLimit ? { $ne: null } : { $eq: null };
  }
  return query;
};

const setFieldDefaultValue = (payload: CreatePollInput) =>
  mergeDeepRight(
    {
      status: POLL_STATUS.POLLING,
      startTime: new Date()
    },
    payload
  );

interface Resolver {
  Poll: PollResolvers;
  Query: QueryResolvers;
  Mutation: MutationResolvers;
}

const resolvers: Resolver = {
  Poll: {
    members: async (poll, variable, { models: { Users } }) => {
      try {
        const memberIdList = poll.members;
        const members = await Users.find({
          _id: { $in: map(id => getObjectIdFromString(id), memberIdList || []) }
        }).toArray();

        return map(insertIdField, members);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    options: async (parent, variable, { models: { Restaurants } }) => {
      try {
        const optionIdList = parent.options;
        const options = await Restaurants.find({
          _id: { $in: map(id => getObjectIdFromString(id), optionIdList || []) }
        }).toArray();

        return map(insertIdField, options);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    opinions: async (poll, variable, { models: { Users, Restaurants } }) => {
      try {
        const getUser = (memberId: string) =>
          Users.findOne({ _id: getObjectIdFromString(memberId) });

        const getRestaurants = (restaurantIdList: string[]) =>
          Restaurants.find({
            _id: { $in: map(getObjectIdFromString, restaurantIdList) }
          }).toArray();

        const populatedOpinions = map(
          async opinion => ({
            member: insertIdField(await getUser(opinion.member)),
            options: map(insertIdField, await getRestaurants(opinion.options))
          }),
          poll.opinions || []
        );

        const result = await Promise.all(populatedOpinions);

        return result;
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    result: async (poll, variable, { models: { Restaurants } }) => {
      try {
        if (isNil(poll.result)) return null;

        const decision = await Restaurants.findOne({
          _id: getObjectIdFromString(poll.result)
        });

        return decision ? insertIdField(decision) : null;
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  },
  Query: {
    polls: async (parent, variables, { models: { Polls } }) => {
      try {
        const { query = {}, page = 1, limit = 10, sort = "_id" } = variables;

        const polls = await Polls.find(getPollsFindQuery(query))
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
    poll: async (parent, variables, { models: { Polls } }) => {
      try {
        const { id } = variables;

        const poll = await Polls.findOne({ _id: getObjectIdFromString(id) });

        return insertIdField(poll);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  },
  Mutation: {
    createPoll: async (_, variables, { models: { Polls } }) => {
      try {
        const { payload } = variables;
        const newDocument = setFieldDefaultValue(payload);
        const result = await Polls.insertOne(newDocument);

        return insertIdField(result.ops[0]);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    updatePoll: async (_, variables, { models: { Polls } }) => {
      try {
        const { id, payload } = variables;

        const originalDocument = await Polls.findOne({
          _id: getObjectIdFromString(id)
        });

        const update = mergeDeepRight<Poll, UpdatePollInput>(
          removeObjectIdField(originalDocument),
          payload
        );

        const newDocument = await Polls.findOneAndUpdate(
          { _id: getObjectIdFromString(id) },
          { $set: update },
          { returnOriginal: false }
        );

        return insertIdField(newDocument.value);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    removePoll: async (parent, variables, { models: { Polls } }) => {
      try {
        const { id } = variables;

        await Polls.findOneAndDelete({ _id: getObjectIdFromString(id) });

        return "Remove Completed!";
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    giveOpinion: async (
      parent,
      variables,
      { models: { Polls, Users, Restaurants } }
    ) => {
      try {
        const { id, payload } = variables;

        if (
          isNil(
            await Users.findOne({ _id: getObjectIdFromString(payload.member) })
          )
        ) {
          throw new UserInputError("找不到用戶的 ID");
        }

        if (
          isEmpty(
            await Restaurants.find({
              _id: { $in: map(getObjectIdFromString, payload.options) }
            }).toArray()
          )
        ) {
          throw new UserInputError("找不到選項的 ID");
        }

        const originalDocument = await Polls.findOne<PollDbObject>({
          _id: getObjectIdFromString(id)
        });

        const opinions = originalDocument?.opinions;
        /** 將新的 opinion 和舊的 opinions merge 起來 */
        const newOpinoins = isNil(opinions)
          ? [payload]
          : reduce<OpinionDbObject, OpinionMapper[]>(
              (acc, { member, options }) => [
                ...acc,
                {
                  member: member.toHexString(),
                  options:
                    /**
                     * 與 payload.member 相同的話，使用 payload 的 option，反之使用原本的 option
                     */
                    member.toHexString() === payload.member
                      ? payload.options
                      : map(option => option.toHexString(), options)
                }
              ],
              []
            )(opinions);

        const newDocument = await Polls.findOneAndUpdate(
          { _id: getObjectIdFromString(id) },
          {
            $set: {
              ...originalDocument,
              opinions: newOpinoins
            }
          },
          { returnOriginal: false }
        );

        return insertIdField(newDocument.value);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    directDecide: async (parent, variables, { models: { Polls } }) => {
      try {
        const { id, result } = variables;

        const originalDocument = await Polls.findOne({
          _id: getObjectIdFromString(id)
        });

        if (originalDocument.status !== POLL_STATUS.POLLING) {
          throw new UserInputError("此投票非進行中，無法完成");
        }
        if (!includes(result, originalDocument.options)) {
          throw new UserInputError("選擇的結果不在選項中，請重新選擇");
        }

        const newDocument = await Polls.findOneAndUpdate(
          { _id: getObjectIdFromString(id) },
          {
            $set: {
              ...originalDocument,
              status: POLL_STATUS.COMPLETED,
              result
            }
          },
          { returnOriginal: false }
        );

        return insertIdField(newDocument.value);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    },
    abandonPoll: async (parent, variables, { models: { Polls } }) => {
      try {
        const { id } = variables;

        const originalDocument = await Polls.findOne({
          _id: getObjectIdFromString(id)
        });

        if (originalDocument.status !== POLL_STATUS.POLLING) {
          throw new UserInputError("此投票非進行中，無法廢棄");
        }

        const newDocument = await Polls.findOneAndUpdate(
          { _id: getObjectIdFromString(id) },
          {
            $set: {
              ...originalDocument,
              status: POLL_STATUS.ABANDONED
            }
          },
          { returnOriginal: false }
        );

        return insertIdField(newDocument.value);
      } catch (error) {
        throw new ApolloError(error.message);
      }
    }
  }
};

export default resolvers;
