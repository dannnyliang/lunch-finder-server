import { gql } from "apollo-server";
import { ObjectId } from "mongodb";

import {
  CreateUserInput,
  RestaurantDbObject,
  UpdateUserInput,
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

const mockUserId = new ObjectId();
const mockUser: CreateUserInput & { _id: ObjectId } = {
  _id: mockUserId,
  name: "mock-name",
  favorite: [
    mockRestaurants[0]._id.toHexString(),
    mockRestaurants[1]._id.toHexString()
  ]
};

describe("[Query.users]", () => {
  it("should return user list without variable", async () => {
    const {
      testClient: { query },
      models: { Users }
    } = testUtils.createServer();

    /** insert mock data */
    await Users.insertOne(mockUser);

    const usersQuery = gql`
      query usersQueryWithOutVariable {
        users {
          docs {
            name
          }
          page
          total
          limit
        }
      }
    `;

    const { data, errors } = await query({
      query: usersQuery
    });

    expect(errors).toBeUndefined();
    expect(data?.users.docs).toHaveLength(1);
    expect(data?.users.docs[0]).toEqual({ name: mockUser.name });
  });

  it("should return user list with variable", async () => {
    const {
      testClient: { query },
      models: { Users, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    const mockUsers: UserDbObject[] = [
      {
        _id: new ObjectId(),
        name: "A",
        favorite: [mockRestaurants[0]._id]
      },
      {
        _id: new ObjectId(),
        name: "AB",
        favorite: [mockRestaurants[0]._id, mockRestaurants[1]._id]
      },
      {
        _id: new ObjectId(),
        name: "B",
        favorite: [mockRestaurants[1]._id]
      }
    ];
    await Restaurants.insertMany(mockRestaurants);
    await Users.insertMany(mockUsers);

    const usersQuery = gql`
      query usersQuery($query: UsersQuery) {
        users(query: $query) {
          docs {
            name
            favorite {
              name
            }
          }
          page
          total
          limit
        }
      }
    `;

    const queryByName = await query({
      query: usersQuery,
      variables: { query: { name: "A" } }
    });

    expect(queryByName.errors).toBeUndefined();
    expect(queryByName.data?.users.docs).toHaveLength(2);

    const queryByFavorite = await query({
      query: usersQuery,
      variables: { query: { favorite: [mockRestaurants[1]._id.toHexString()] } }
    });

    expect(queryByFavorite.errors).toBeUndefined();
    expect(queryByFavorite.data?.users.docs).toHaveLength(2);
  });
});

describe("[Mutation.createUser]", () => {
  it("should create user correctly", async () => {
    const {
      testClient: { mutate },
      models: { Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Restaurants.insertMany(mockRestaurants);

    const createMutation = gql`
      mutation createUser($payload: CreateUserInput!) {
        createUser(payload: $payload) {
          name
          favorite {
            name
          }
        }
      }
    `;

    const createPayload: CreateUserInput = {
      name: "name",
      favorite: [mockRestaurants[0]._id.toHexString()]
    };

    const create = await mutate({
      mutation: createMutation,
      variables: { payload: createPayload }
    });

    expect(create.errors).toBeUndefined();
    expect(create.data?.createUser).toEqual({
      name: createPayload.name,
      favorite: [{ name: mockRestaurants[0].name }]
    });
  });
});

describe("[Mutation.updateUser]", () => {
  it("should update user correctly", async () => {
    const {
      testClient: { mutate },
      models: { Users, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Restaurants.insertMany(mockRestaurants);
    await Users.insertOne(mockUser);

    const updateMutation = gql`
      mutation updateUser($id: ID!, $payload: UpdateUserInput!) {
        updateUser(id: $id, payload: $payload) {
          name
          favorite {
            name
          }
        }
      }
    `;

    const updatePayload: UpdateUserInput = {
      name: "updated-name",
      favorite: [mockRestaurants[1]._id.toHexString()]
    };
    const update = await mutate({
      mutation: updateMutation,
      variables: {
        id: mockUserId.toHexString(),
        payload: updatePayload
      }
    });

    expect(update.errors).toBeUndefined();
    expect(update.data?.updateUser).toEqual({
      name: updatePayload.name,
      favorite: [{ name: mockRestaurants[1].name }]
    });
  });
});

describe("[Mutation.removeUser]", () => {
  it("should remove user correctly", async () => {
    const {
      testClient: { mutate },
      models: { Users }
    } = testUtils.createServer();

    /** insert mock data */
    await Users.insertOne(mockUser);

    const removeMutation = gql`
      mutation removeUser($id: ID!) {
        removeUser(id: $id)
      }
    `;

    const remove = await mutate({
      mutation: removeMutation,
      variables: {
        id: mockUserId.toHexString()
      }
    });

    expect(remove.errors).toBeUndefined();
    expect(remove.data?.removeUser).toEqual("Remove Completed!");
  });
});
