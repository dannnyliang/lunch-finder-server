import fs from "fs";
import path from "path";

import { gql } from "apollo-server";
import glob from "glob";
import { fileLoader, mergeResolvers, mergeTypes } from "merge-graphql-schemas";

const pathToModules = path.join(__dirname);

export const allTypes = glob
  .sync(`${pathToModules}/**/*.graphql`)
  .map(x => fs.readFileSync(x, { encoding: "utf8" }));

export const allResolvers = glob
  .sync(`${__dirname}/**/resolver.[tj]s`)
  .map(resolver => require(resolver).default);

export const typeDefs = gql(
  mergeTypes(allTypes, {
    all: true
  })
);

export const resolvers = mergeResolvers(allResolvers);
