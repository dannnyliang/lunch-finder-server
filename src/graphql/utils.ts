import { ObjectID, ObjectId } from "mongodb";
import { assoc, dissoc } from "ramda";

export const insertIdField = <D extends { _id: ObjectID }>(document: D) =>
  assoc("id", document._id.toString(), document);

export const removeObjectIdField = dissoc("_id");

export const getObjectIdFromString = (id: string) => new ObjectId(id);
