import { ApolloError } from "apollo-server";
import firebaseClient from "../../firebase-setup";

const database = firebaseClient.database();

const resolvers = {
  Query: {
    users: async () => {
      const usersSnapshot = await database.ref("users/").once("value");
      const users = Object.values(usersSnapshot.val());
      return users;
    }
  },
  Mutation: {
    createUser: async (_, variables) => {
      const { payload } = variables;
      const newUserRef = await database.ref("users/").push();
      await newUserRef.set(payload, error => {
        if (error) {
          throw new ApolloError(error.message);
        }
      });
      const createdUserSnapshot = await newUserRef.once("value");
      return createdUserSnapshot.val();
    }
  }
};

export default resolvers;
