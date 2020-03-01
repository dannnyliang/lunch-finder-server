import { ApolloError } from "apollo-server";

import firebaseClient from "../../firebase-setup";

const database = firebaseClient.database();

const resolvers = {
  Query: {
    restaurants: async () => {
      const snapshot = await database.ref("restaurants/").once("value");
      const restaurants = Object.values(snapshot.val());
      return restaurants;
    }
  },
  Mutation: {
    createRestaurant: async (_, variables) => {
      const { payload } = variables;
      const newRestaurantRef = await database.ref("restaurants/").push();
      await newRestaurantRef.set(payload, error => {
        if (error) {
          throw new ApolloError(error.message);
        }
      });
      const createdUserSnapshot = await newRestaurantRef.once("value");
      return createdUserSnapshot.val();
    }
  }
};

export default resolvers;
