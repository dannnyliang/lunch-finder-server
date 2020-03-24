import { writeFileSync } from "fs";

import { mergeTypes } from "merge-graphql-schemas";

import { allTypes } from "./graphql";

writeFileSync(
  `${__dirname}/generated/mergedSchema.graphql`,
  mergeTypes(allTypes)
);
