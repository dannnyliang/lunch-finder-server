import { MachineConfig } from "xstate";

import { Event, EventTypes } from "./actions";
import { Context, initialContext } from "./context";

interface StateSchema {
  states: {
    stopped: {};
    running: {};
    paused: {};
  };
}

const timerMachineConfig: MachineConfig<Context, StateSchema, Event> = {
  id: "timer",
  initial: "stopped",
  context: initialContext,
  states: {
    stopped: {
      on: {
        "": {
          target: ["running"],
          cond: context =>
            context.limit && context.current > 0
              ? context.limit > context.current
              : false
        },
        RUN: {
          target: ["running"]
        }
      }
    },
    running: {
      invoke: {
        src: () => cb => {
          const interval = setInterval(() => cb(EventTypes.TICK), 1000);
          return () => clearInterval(interval);
        }
      },
      on: {
        "": {
          target: ["stopped"],
          cond: context =>
            context.limit ? context.current >= context.limit : false
        },
        TICK: {
          actions: ["tick"]
        },
        PAUSE: {
          target: ["paused"]
        },
        STOP: {
          target: ["stopped"]
        }
      }
    },
    paused: {
      on: {
        RUN: {
          target: ["running"]
        },
        STOP: {
          target: ["stopped"]
        }
      }
    }
  },
  on: {
    UPDATE_LIMIT: {
      actions: ["updateLimit"]
    }
  }
};

export default timerMachineConfig;
