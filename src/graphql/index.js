import path from "path";

import { gql } from "apollo-server";
import { fileLoader, mergeResolvers, mergeTypes } from "merge-graphql-schemas";

export const typeDefs = gql(
  mergeTypes(fileLoader(path.join(__dirname, "/**/*.graphql")), {
    all: true
  })
);

export const resolvers = mergeResolvers(
  fileLoader(path.join(__dirname, "/**/resolver.js"))
);
