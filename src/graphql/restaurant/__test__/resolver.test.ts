import { gql } from "apollo-server";
import { ObjectId } from "mongodb";
import { omit } from "ramda";

import {
  CreateRestaurantInput,
  RestaurantDbObject,
  UpdateRestaurantInput
} from "../../../generated/types";
import { testUtils } from "../../../test/jest.setup";

const mockRestaurantId = new ObjectId();
const mockRestaurant: RestaurantDbObject = {
  _id: mockRestaurantId,
  name: "mock-name",
  address: "mock-address"
};

describe("Restaurant Query resolvers", () => {
  it("should query restaurant list without variable correctly", async () => {
    const {
      testClient: { query },
      models: { Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Restaurants.insertOne(mockRestaurant);

    const restaurantQuery = gql`
      query restautantsQueryWithOutVariable {
        restaurants {
          docs {
            name
            address
          }
          page
          total
          limit
        }
      }
    `;

    const { data, errors } = await query({
      query: restaurantQuery
    });

    expect(errors).toBeUndefined();
    expect(data?.restaurants.docs).toHaveLength(1);
    expect(data?.restaurants.docs[0]).toEqual(omit(["_id"], mockRestaurant));
  });

  it("should query restaurant list with variable correctly", async () => {
    const {
      testClient: { query },
      models: { Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    const mockRestaurants: RestaurantDbObject[] = [
      {
        _id: new ObjectId(),
        name: "A",
        address: "1",
        averagePrice: 100
      },
      {
        _id: new ObjectId(),
        name: "AB",
        address: "12",
        averagePrice: 80
      },
      {
        _id: new ObjectId(),
        name: "B",
        address: "2",
        averagePrice: 60
      }
    ];
    await Restaurants.insertMany(mockRestaurants);

    const restaurantQuery = gql`
      query restautantsQuery($query: RestaurantsQuery) {
        restaurants(query: $query) {
          docs {
            name
            address
            averagePrice
          }
          page
          total
          limit
        }
      }
    `;

    const queryByName = await query({
      query: restaurantQuery,
      variables: { query: { name: "A" } }
    });

    expect(queryByName.errors).toBeUndefined();
    expect(queryByName.data?.restaurants.docs).toHaveLength(2);

    const queryByAddress = await query({
      query: restaurantQuery,
      variables: { query: { address: "1" } }
    });

    expect(queryByAddress.errors).toBeUndefined();
    expect(queryByAddress.data?.restaurants.docs).toHaveLength(2);

    const queryByaveragePrice = await query({
      query: restaurantQuery,
      variables: { query: { averagePrice: 85 } }
    });

    expect(queryByaveragePrice.errors).toBeUndefined();
    expect(queryByaveragePrice.data?.restaurants.docs).toHaveLength(1);
  });
});

describe("Restaurant Mutation resolvers", () => {
  /** ----- Create ----- */
  it("should 'create' restaurant correctly", async () => {
    const {
      testClient: { mutate }
    } = testUtils.createServer();

    const createMutation = gql`
      mutation createRestaurant($payload: CreateRestaurantInput!) {
        createRestaurant(payload: $payload) {
          name
          address
        }
      }
    `;
    const createPayload: CreateRestaurantInput = {
      name: "name",
      address: "address"
    };

    const create = await mutate({
      mutation: createMutation,
      variables: { payload: createPayload }
    });

    expect(create.errors).toBeUndefined();
    expect(create.data?.createRestaurant).toEqual(createPayload);
  });

  /** ----- Update ----- */
  it("should 'update' restaurant correctly", async () => {
    const {
      testClient: { mutate },
      models: { Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Restaurants.insertOne(mockRestaurant);

    const updateMutation = gql`
      mutation updateRestaurant($id: ID!, $payload: UpdateRestaurantInput!) {
        updateRestaurant(id: $id, payload: $payload) {
          name
          address
        }
      }
    `;

    const updatePayload: UpdateRestaurantInput = {
      name: "updated-name",
      address: "updated-address"
    };
    const update = await mutate({
      mutation: updateMutation,
      variables: {
        id: mockRestaurantId.toHexString(),
        payload: updatePayload
      }
    });

    expect(update.errors).toBeUndefined();
    expect(update.data?.updateRestaurant).toEqual(updatePayload);
  });

  /** ----- Remove ----- */
  it("should 'remove' restaurant correctly", async () => {
    const {
      testClient: { mutate },
      models: { Restaurants }
    } = testUtils.createServer();

    /** insert mock data */
    await Restaurants.insertOne(mockRestaurant);

    const removeMutation = gql`
      mutation removeRestaurant($id: ID!) {
        removeRestaurant(id: $id)
      }
    `;

    const remove = await mutate({
      mutation: removeMutation,
      variables: {
        id: mockRestaurantId.toHexString()
      }
    });

    expect(remove.errors).toBeUndefined();
    expect(remove.data?.removeRestaurant).toEqual("Remove Completed!");
  });
});
