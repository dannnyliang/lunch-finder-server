import { gql } from "apollo-server";
import { ObjectId } from "mongodb";

import {
  CreateGroupInput,
  RestaurantDbObject,
  UpdateGroupInput,
  UserDbObject
} from "../../../generated/types";
import { testUtils } from "../../../test/jest.setup";

const mockUser: UserDbObject = {
  _id: new ObjectId(),
  name: "mock-user",
  favorite: ["restaurant-1", "restaurant-2"]
};

const mockRestaurant: RestaurantDbObject = {
  _id: new ObjectId(),
  name: "mock-restaurant",
  address: "mock-address"
};

const mockGroupId = new ObjectId();
const mockGroup: CreateGroupInput & { _id: ObjectId } = {
  _id: mockGroupId,
  name: "mock-group",
  members: [mockUser._id.toHexString()],
  options: [mockRestaurant._id.toHexString()]
};

describe("[Query.groups]", () => {
  it("should return group list without variable", async () => {
    const {
      testClient: { query },
      models: { Users, Restaurants, Groups }
    } = testUtils.createServer();

    /** insert mock data */
    await Users.insertOne(mockUser);
    await Restaurants.insertOne(mockRestaurant);
    await Groups.insertOne(mockGroup);

    const groupsQuery = gql`
      query groupsQueryWithOutVariable {
        groups {
          docs {
            name
            members {
              name
            }
            options {
              name
            }
          }
          page
          total
          limit
        }
      }
    `;

    const { data, errors } = await query({
      query: groupsQuery
    });

    expect(errors).toBeUndefined();
    expect(data?.groups.docs).toHaveLength(1);
    expect(data?.groups.docs[0]).toEqual({
      name: mockGroup.name,
      members: [{ name: mockUser.name }],
      options: [{ name: mockRestaurant.name }]
    });
  });

  it("should return group list with variable", async () => {
    const {
      testClient: { query },
      models: { Users, Restaurants, Groups }
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
    await Users.insertMany(mockUsers);

    const mockRestaurants: RestaurantDbObject[] = [
      {
        _id: new ObjectId(),
        name: "mock-restaurant-1",
        address: "mock-address-1"
      },
      {
        _id: new ObjectId(),
        name: "mock-restaurant-2",
        address: "mock-address-2"
      }
    ];
    await Restaurants.insertMany(mockRestaurants);

    const mockGroups: CreateGroupInput[] = [
      {
        name: "mock-group-1",
        members: [mockUsers[0]._id.toHexString()],
        options: [mockRestaurants[0]._id.toHexString()]
      },
      {
        name: "mock-group-2",
        members: [
          mockUsers[0]._id.toHexString(),
          mockUsers[1]._id.toHexString()
        ],
        options: [
          mockRestaurants[0]._id.toHexString(),
          mockRestaurants[1]._id.toHexString()
        ]
      }
    ];
    await Groups.insertMany(mockGroups);

    const groupsQuery = gql`
      query groupsQuery($query: GroupsQuery) {
        groups(query: $query) {
          docs {
            name
            members {
              name
            }
            options {
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
      query: groupsQuery,
      variables: { query: { name: "1" } }
    });

    expect(queryByName.errors).toBeUndefined();
    expect(queryByName.data?.groups.docs).toHaveLength(1);

    const queryByMember = await query({
      query: groupsQuery,
      variables: { query: { members: [mockUsers[1]._id.toHexString()] } }
    });

    expect(queryByMember.errors).toBeUndefined();
    expect(queryByMember.data?.groups.docs).toHaveLength(1);
  });
});

describe("[Mutation.createGroup]", () => {
  it("should create group correctly", async () => {
    const {
      testClient: { mutate },
      models: { Users, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Users.insertOne(mockUser);
    await Restaurants.insertOne(mockRestaurant);

    const createMutation = gql`
      mutation createGroup($payload: CreateGroupInput!) {
        createGroup(payload: $payload) {
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

    const createPayload: CreateGroupInput = {
      name: "name",
      members: [mockUser._id.toHexString()],
      options: [mockRestaurant._id.toHexString()]
    };

    const create = await mutate({
      mutation: createMutation,
      variables: { payload: createPayload }
    });

    expect(create.errors).toBeUndefined();
    expect(create.data?.createGroup).toEqual({
      name: createPayload.name,
      members: [{ name: mockUser.name }],
      options: [{ name: mockRestaurant.name }]
    });
  });
});

describe("[Mutation.updateGroup]", () => {
  it("should update group.name correctly", async () => {
    const {
      testClient: { mutate },
      models: { Groups }
    } = testUtils.createServer();

    /** insert mock data */
    await Groups.insertOne(mockGroup);

    const updateMutation = gql`
      mutation updateGroupName($id: ID!, $payload: UpdateGroupInput!) {
        updateGroup(id: $id, payload: $payload) {
          name
        }
      }
    `;

    const updatePayload: UpdateGroupInput = {
      name: "updated-name"
    };
    const update = await mutate({
      mutation: updateMutation,
      variables: {
        id: mockGroupId.toHexString(),
        payload: updatePayload
      }
    });

    expect(update.errors).toBeUndefined();
    expect(update.data?.updateGroup).toEqual(updatePayload);
  });

  it("should update group.options correctly", async () => {
    const {
      testClient: { mutate },
      models: { Groups, Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    const mockRestaurant: RestaurantDbObject = {
      _id: new ObjectId(),
      name: "mock-new-restaurant",
      address: "mock-new-address"
    };
    await Restaurants.insertOne(mockRestaurant);
    await Groups.insertOne(mockGroup);

    const updateMutation = gql`
      mutation updateGroupOption($id: ID!, $payload: UpdateGroupInput!) {
        updateGroup(id: $id, payload: $payload) {
          name
          options {
            name
          }
        }
      }
    `;

    const updatePayload: UpdateGroupInput = {
      options: [mockRestaurant._id.toHexString()]
    };
    const update = await mutate({
      mutation: updateMutation,
      variables: {
        id: mockGroupId.toHexString(),
        payload: updatePayload
      }
    });

    expect(update.errors).toBeUndefined();
    expect(update.data?.updateGroup.options).toEqual([
      { name: mockRestaurant.name }
    ]);
  });
});

describe("[Mutation.removeGroup]", () => {
  it("should remove group correctly", async () => {
    const {
      testClient: { mutate },
      models: { Groups }
    } = testUtils.createServer();

    /** insert mock data */
    await Groups.insertOne(mockGroup);

    const removeMutation = gql`
      mutation removeGroup($id: ID!) {
        removeGroup(id: $id)
      }
    `;

    const remove = await mutate({
      mutation: removeMutation,
      variables: {
        id: mockGroupId.toHexString()
      }
    });

    expect(remove.errors).toBeUndefined();
    expect(remove.data?.removeGroup).toEqual("Remove Completed!");
  });
});
