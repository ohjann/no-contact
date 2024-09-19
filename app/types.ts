import type { BSONType } from "mongodb";

export type User = {
  id: string;
  name: string;
};

export type Message = {
  _id?: BSONType;
  scrambled: string;
  sentAt: string;
  text: string;
  user: User;
};
