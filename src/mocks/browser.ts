import { socketHandler } from "./socket";
import { demoHandlers } from "./demo-handlers";
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
export const worker = setupWorker(...handlers, ...demoHandlers, socketHandler);
