import { Machine } from "xstate";

import actions from "./actions";
import { Context, initialContext } from "./context";
import timerMachineConfig from "./timer";

type CustomContext = Pick<Context, "limit">;

const getTimerMachine = (customContext: CustomContext) =>
  Machine(
    timerMachineConfig,
    { actions },
    {
      ...initialContext,
      ...customContext
    }
  );

export default getTimerMachine;
