import { gql } from "apollo-server";
import { ObjectId } from "mongodb";

import {
  CreatePollInput,
  GiveOpinionInput,
  PollDbObject,
  PollStatus,
  RestaurantDbObject,
  UpdatePollInput,
  UserDbObject
} from "../../../generated/types";
import { testUtils } from "../../../test/jest.setup";

const mockRestaurants: RestaurantDbObject[] = [
  {
    _id: new ObjectId(),
    name: "mock-restaurant-1",
    address: "mock-address"
  },
  {
    _id: new ObjectId(),
    name: "mock-restaurant-2",
    address: "mock-address"
  }
];

const mockUser: UserDbObject = {
  _id: new ObjectId(),
  name: "mock-user",
  favorite: [mockRestaurants[0]._id, mockRestaurants[1]._id]
};

const mockPollId = new ObjectId();
const mockPoll: CreatePollInput & { _id: ObjectId } = {
  _id: mockPollId,
  name: "mock-poll",
  members: [mockUser._id.toHexString()],
  options: [mockRestaurants[0]._id.toHexString()]
};

describe("[Query.poll]", () => {
  it("should return poll ", async () => {
    const {
      testClient: { query },
      models: { Polls, Users, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Users.insertOne(mockUser);
    await Restaurants.insertMany(mockRestaurants);
    await Polls.insertOne(mockPoll);

    const pollQuery = gql`
      query pollQuery($id: ID!) {
        poll(id: $id) {
          name
          members {
            name
          }
          options {
            name
          }
        }
      }
    `;

    const { data, errors } = await query({
      query: pollQuery,
      variables: { id: mockPollId.toHexString() }
    });

    expect(errors).toBeUndefined();
    expect(data?.poll).not.toBeNull();
    expect(data?.poll).toEqual({
      name: mockPoll.name,
      members: [{ name: mockUser.name }],
      options: [{ name: mockRestaurants[0].name }]
    });

    expect(1).toBe(1);
  });
});

describe("[Query.polls]", () => {
  it("should return poll list without variables", async () => {
    const {
      testClient: { query },
      models: { Polls, Users, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Users.insertOne(mockUser);
    await Restaurants.insertMany(mockRestaurants);
    await Polls.insertOne(mockPoll);

    const pollsQuery = gql`
      query pollsQueryWithoutVariable {
        polls {
          docs {
            name
            members {
              name
            }
            options {
              name
            }
          }
        }
      }
    `;

    const { data, errors } = await query({ query: pollsQuery });

    expect(errors).toBeUndefined();
    expect(data?.polls.docs).toHaveLength(1);
    expect(data?.polls.docs[0]).toEqual({
      name: mockPoll.name,
      members: [{ name: mockUser.name }],
      options: [{ name: mockRestaurants[0].name }]
    });
  });

  test("should return poll list with variables", async () => {
    const {
      testClient: { query },
      models: { Polls, Users, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    const mockUsers: UserDbObject[] = [
      {
        _id: new ObjectId(),
        name: "mock-user-1"
      },
      {
        _id: new ObjectId(),
        name: "mock-user-2"
      }
    ];
    const mockRestaurants: RestaurantDbObject[] = [
      {
        _id: new ObjectId(),
        name: "mock-restaurant-1",
        address: ""
      },
      {
        _id: new ObjectId(),
        name: "mock-restaurant-2",
        address: ""
      }
    ];
    const mockPolls: PollDbObject[] = [
      {
        _id: new ObjectId(),
        name: "1-1",
        status: PollStatus.Polling,
        members: [mockUsers[0]._id],
        options: [mockRestaurants[0]._id],
        startTime: new Date()
      },
      {
        _id: new ObjectId(),
        name: "1-2",
        status: PollStatus.Polling,
        members: [mockUsers[1]._id],
        options: [mockRestaurants[1]._id],
        startTime: new Date()
      },
      {
        _id: new ObjectId(),
        name: "0-3",
        status: PollStatus.Completed,
        members: [mockUsers[1]._id],
        options: [mockRestaurants[0]._id, mockRestaurants[1]._id],
        result: mockRestaurants[1]._id,
        limitTime: 10,
        startTime: new Date()
      }
    ];
    await Users.insertMany(mockUsers);
    await Restaurants.insertMany(mockRestaurants);
    await Polls.insertMany(mockPolls);

    const pollsQuery = gql`
      query pollsQueryWithVariable($query: PollsQuery) {
        polls(query: $query) {
          docs {
            name
            members {
              name
            }
            options {
              name
            }
          }
        }
      }
    `;

    const queryByName = await query({
      query: pollsQuery,
      variables: { query: { name: "1" } }
    });

    expect(queryByName.errors).toBeUndefined();
    expect(queryByName.data?.polls.docs).toHaveLength(2);

    const queryByStatus = await query({
      query: pollsQuery,
      variables: { query: { status: PollStatus.Polling } }
    });

    expect(queryByStatus.errors).toBeUndefined();
    expect(queryByStatus.data?.polls.docs).toHaveLength(2);

    const queryByResult = await query({
      query: pollsQuery,
      variables: { query: { result: mockRestaurants[1]._id.toHexString() } }
    });

    expect(queryByResult.errors).toBeUndefined();
    expect(queryByResult.data?.polls.docs).toHaveLength(1);
    expect(queryByResult.data?.polls.docs[0]).toEqual({
      name: "0-3",
      members: [{ name: mockUsers[1].name }],
      options: [
        { name: mockRestaurants[0].name },
        { name: mockRestaurants[1].name }
      ]
    });

    const queryByTimeLimit = await query({
      query: pollsQuery,
      variables: { query: { isTimeLimit: true } }
    });

    expect(queryByTimeLimit.errors).toBeUndefined();
    expect(queryByTimeLimit.data?.polls.docs).toHaveLength(1);
  });
});

describe("[Mutation.createPoll]", () => {
  it("should create poll correctly", async () => {
    const {
      testClient: { mutate },
      models: { Users, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Users.insertOne(mockUser);
    await Restaurants.insertOne(mockRestaurants[0]);

    const createMutation = gql`
      mutation createPoll($payload: CreatePollInput!) {
        createPoll(payload: $payload) {
          name
          members {
            name
          }
          options {
            name
          }
          limitTime
        }
      }
    `;

    const createPayload: CreatePollInput = {
      name: "name",
      members: [mockUser._id.toHexString()],
      options: [mockRestaurants[0]._id.toHexString()],
      limitTime: 10
    };

    const create = await mutate({
      mutation: createMutation,
      variables: { payload: createPayload }
    });

    expect(create.errors).toBeUndefined();
    expect(create.data?.createPoll).toEqual({
      name: createPayload.name,
      members: [{ name: mockUser.name }],
      options: [{ name: mockRestaurants[0].name }],
      limitTime: 10
    });
  });
});

describe("[Mutation.updatePoll]", () => {
  it("should update poll.name correctly", async () => {
    const {
      testClient: { mutate },
      models: { Polls }
    } = testUtils.createServer();

    /** insert mock data */
    await Polls.insertOne(mockPoll);

    const updateMutation = gql`
      mutation updatePoll($id: ID!, $payload: UpdatePollInput!) {
        updatePoll(id: $id, payload: $payload) {
          name
        }
      }
    `;

    const updatePayload: UpdatePollInput = {
      name: "name"
    };

    const update = await mutate({
      mutation: updateMutation,
      variables: { id: mockPoll._id.toHexString(), payload: updatePayload }
    });

    expect(update.errors).toBeUndefined();
    expect(update.data?.updatePoll).toEqual({
      name: updatePayload.name
    });
  });
});

describe("[Mutation.removePoll]", () => {
  it("should remove poll.name correctly", async () => {
    const {
      testClient: { mutate },
      models: { Polls }
    } = testUtils.createServer();

    /** insert mock data */
    await Polls.insertOne(mockPoll);

    const removeMutation = gql`
      mutation removePoll($id: ID!) {
        removePoll(id: $id)
      }
    `;

    const remove = await mutate({
      mutation: removeMutation,
      variables: { id: mockPoll._id.toHexString() }
    });

    expect(remove.errors).toBeUndefined();
    expect(remove.data?.removePoll).toEqual("Remove Completed!");
  });
});

describe("[Mutation.giveOpinion]", () => {
  it("should give opinion to poll correctly", async () => {
    const {
      testClient: { mutate },
      models: { Polls, Users, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Users.insertOne(mockUser);
    await Restaurants.insertOne(mockRestaurants[0]);
    await Polls.insertOne(mockPoll);

    const giveOpinionMutation = gql`
      mutation GiveOpinion($id: ID!, $payload: GiveOpinionInput!) {
        giveOpinion(id: $id, payload: $payload) {
          name
          opinions {
            member {
              name
            }
            options {
              name
            }
          }
        }
      }
    `;

    const giveOpinionPayload: GiveOpinionInput = {
      member: mockUser._id.toHexString(),
      options: [mockRestaurants[0]._id.toHexString()]
    };

    const giveOpinion = await mutate({
      mutation: giveOpinionMutation,
      variables: { id: mockPoll._id.toHexString(), payload: giveOpinionPayload }
    });

    expect(giveOpinion.errors).toBeUndefined();
    expect(giveOpinion.data?.giveOpinion).toEqual({
      name: mockPoll.name,
      opinions: [
        {
          member: { name: mockUser.name },
          options: [{ name: mockRestaurants[0].name }]
        }
      ]
    });
  });
});

describe("[Mutation.directDecide]", () => {
  it("should not direct decide poll which status is not `POLLING`", async () => {
    const {
      testClient: { mutate },
      models: { Polls, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Restaurants.insertOne(mockRestaurants[0]);
    await Polls.insertOne(mockPoll);

    const directDecideMutation = gql`
      mutation DirectDecideWithError($id: ID!, $result: ID!) {
        directDecide(id: $id, result: $result) {
          name
          result {
            name
          }
        }
      }
    `;

    const directDecide = await mutate({
      mutation: directDecideMutation,
      variables: {
        id: mockPoll._id.toHexString(),
        result: mockRestaurants[0]._id.toHexString()
      }
    });

    expect(directDecide.errors).toHaveLength(1);
    expect(directDecide.errors && directDecide.errors[0].message).toBe(
      "此投票非進行中，無法完成"
    );
  });

  it("should direct decide poll result correctly", async () => {
    const {
      testClient: { mutate },
      models: { Polls, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Restaurants.insertOne(mockRestaurants[0]);
    await Polls.insertOne(mockPoll);

    const createMutation = gql`
      mutation createPollToDecide($payload: CreatePollInput!) {
        createPoll(payload: $payload) {
          id
        }
      }
    `;

    const directDecideMutation = gql`
      mutation DirectDecide($id: ID!, $result: ID!) {
        directDecide(id: $id, result: $result) {
          result {
            name
          }
        }
      }
    `;

    const create = await mutate({
      mutation: createMutation,
      variables: {
        payload: {
          name: "name",
          members: [mockUser._id.toHexString()],
          options: [mockRestaurants[0]._id.toHexString()],
          limitTime: 10
        }
      }
    });

    const directDecide = await mutate({
      mutation: directDecideMutation,
      variables: {
        id: create.data?.createPoll.id,
        result: mockRestaurants[0]._id.toHexString()
      }
    });

    expect(directDecide.errors).toBeUndefined();
    expect(directDecide.data?.directDecide).toEqual({
      result: { name: mockRestaurants[0].name }
    });
  });
});

describe("[Mutation.abandonPoll]", () => {
  it("should not abandon poll which status is not `POLLING`", async () => {
    const {
      testClient: { mutate },
      models: { Polls }
    } = testUtils.createServer();

    /** insert mock data */
    await Polls.insertOne(mockPoll);

    const abandonPollMutation = gql`
      mutation abandonPollWithError($id: ID!) {
        abandonPoll(id: $id) {
          status
        }
      }
    `;

    const abandonPoll = await mutate({
      mutation: abandonPollMutation,
      variables: {
        id: mockPoll._id.toHexString()
      }
    });

    expect(abandonPoll.errors).toHaveLength(1);
    expect(abandonPoll.errors && abandonPoll.errors[0].message).toBe(
      "此投票非進行中，無法廢棄"
    );
  });

  it("should abandon poll correctly", async () => {
    const {
      testClient: { mutate },
      models: { Polls, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Restaurants.insertOne(mockRestaurants[0]);
    await Polls.insertOne(mockPoll);

    const createMutation = gql`
      mutation createPollToAbandon($payload: CreatePollInput!) {
        createPoll(payload: $payload) {
          id
        }
      }
    `;

    const abandonPollMutation = gql`
      mutation abandonPoll($id: ID!) {
        abandonPoll(id: $id) {
          status
        }
      }
    `;

    const create = await mutate({
      mutation: createMutation,
      variables: {
        payload: {
          name: "name",
          members: [mockUser._id.toHexString()],
          options: [mockRestaurants[0]._id.toHexString()],
          limitTime: 10
        }
      }
    });

    const abandonPoll = await mutate({
      mutation: abandonPollMutation,
      variables: {
        id: create.data?.createPoll.id
      }
    });

    expect(abandonPoll.errors).toBeUndefined();
    expect(abandonPoll.data?.abandonPoll).toEqual({
      status: PollStatus.Abandoned
    });
  });
});
