import fs from "fs";
import path from "path";

import { gql } from "apollo-server";
import glob from "glob";
import { mergeResolvers, mergeTypes } from "merge-graphql-schemas";
import { Collection, Db } from "mongodb";

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

export interface Models {
  Users: Collection;
  Restaurants: Collection;
  Groups: Collection;
}

export const getModels = (db: Db): Models => ({
  Users: db.collection("Users"),
  Restaurants: db.collection("Restaurants"),
  Groups: db.collection("Groups")
});
