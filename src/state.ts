import { ExtensionContext, Uri } from "vscode";
import { Releases } from "./releases";
import { Project } from "./project";
import { Session } from "./session";

export type State = {
  state:
    | "initializing"
    | "starting"
    | "restarting"
    | "started"
    | "stopping"
    | "stopped"
    | "error";

  activeProject?: Project;
  allProjects?: Map<Uri, Project>;
  activeSession?: Session;
  context: ExtensionContext;
  hidden: boolean;
  releases: Releases;
};

const _state: State = {
  state: "initializing",
  hidden: false,
} as State;

export const state = new Proxy(_state, {
  get(target, prop, receiver) {
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value, receiver) {
    if (Reflect.set(target, prop, value, receiver)) {
      // update something
      return true;
    }

    return false;
  },
});
