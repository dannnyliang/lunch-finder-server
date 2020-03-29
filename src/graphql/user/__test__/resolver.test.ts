import { gql } from "apollo-server";
import { ObjectId } from "mongodb";
import { omit } from "ramda";

import {
  CreateUserInput,
  UpdateUserInput,
  UserDbObject
} from "../../../generated/types";
import { testUtils } from "../../../test/jest.setup";

const mockUserId = new ObjectId();
const mockUser: UserDbObject = {
  _id: mockUserId,
  name: "mock-name",
  favorite: ["restaurant-1", "restaurant-2"]
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
            favorite
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
    expect(data?.users.docs[0]).toEqual(omit(["_id"], mockUser));
  });

  it("should return user list with variable", async () => {
    const {
      testClient: { query },
      models: { Users }
    } = testUtils.createServer();

    /** insert mock data */
    const mockUsers: UserDbObject[] = [
      {
        _id: new ObjectId(),
        name: "A",
        favorite: ["1"]
      },
      {
        _id: new ObjectId(),
        name: "AB",
        favorite: ["1", "2"]
      },
      {
        _id: new ObjectId(),
        name: "B",
        favorite: ["2"]
      }
    ];
    await Users.insertMany(mockUsers);

    const usersQuery = gql`
      query usersQuery($query: UsersQuery) {
        users(query: $query) {
          docs {
            name
            favorite
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
      variables: { query: { favorite: ["1"] } }
    });

    expect(queryByFavorite.errors).toBeUndefined();
    expect(queryByFavorite.data?.users.docs).toHaveLength(2);
  });
});

describe("[Mutation.createUser]", () => {
  it("should create user correctly", async () => {
    const {
      testClient: { mutate }
    } = testUtils.createServer();

    const createMutation = gql`
      mutation createUser($payload: CreateUserInput!) {
        createUser(payload: $payload) {
          name
          favorite
        }
      }
    `;

    const createPayload: CreateUserInput = {
      name: "name",
      favorite: ["favorite"]
    };

    const create = await mutate({
      mutation: createMutation,
      variables: { payload: createPayload }
    });

    expect(create.errors).toBeUndefined();
    expect(create.data?.createUser).toEqual(createPayload);
  });
});

describe("[Mutation.updateUser]", () => {
  it("should update user correctly", async () => {
    const {
      testClient: { mutate },
      models: { Users }
    } = testUtils.createServer();

    /** insert mock data */
    await Users.insertOne(mockUser);

    const updateMutation = gql`
      mutation updateUser($id: ID!, $payload: UpdateUserInput!) {
        updateUser(id: $id, payload: $payload) {
          name
          favorite
        }
      }
    `;

    const updatePayload: UpdateUserInput = {
      name: "updated-name",
      favorite: ["restaurant-1"]
    };
    const update = await mutate({
      mutation: updateMutation,
      variables: {
        id: mockUserId.toHexString(),
        payload: updatePayload
      }
    });

    expect(update.errors).toBeUndefined();
    expect(update.data?.updateUser).toEqual(updatePayload);
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
