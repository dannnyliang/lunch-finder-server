import { assoc, dissoc } from "ramda";

export const insertIdField = document => assoc("id", document._id, document);
export const removeObjectIdField = dissoc("_id");
