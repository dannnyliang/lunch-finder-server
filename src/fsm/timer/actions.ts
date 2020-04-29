import { assign } from "xstate";

import { Context } from "./context";

export type Event =
  | StartEvent
  | TickEvent
  | PauseEvent
  | StopEvent
  | UpdateLimitEvent;

export enum EventTypes {
  RUN = "RUN",
  TICK = "TICK",
  PAUSE = "PAUSE",
  STOP = "STOP",
  UPDATE_LIMIT = "UPDATE_LIMIT"
}

interface StartEvent {
  type: EventTypes.RUN;
}
interface TickEvent {
  type: EventTypes.TICK;
}
interface PauseEvent {
  type: EventTypes.PAUSE;
}
interface StopEvent {
  type: EventTypes.STOP;
}
interface UpdateLimitEvent {
  type: EventTypes.UPDATE_LIMIT;
  limit: number;
}

const tick = assign<Context, TickEvent>({
  current: context => context.current + 1
});

const updateLimit = assign<Context, UpdateLimitEvent>({
  limit: (context, event) => event.limit
});

const actionMap: any = {
  tick,
  updateLimit
};

export default actionMap;
