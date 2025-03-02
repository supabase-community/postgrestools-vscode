"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.state = void 0;
const _state = {
    state: "initializing",
    hidden: false,
};
exports.state = new Proxy(_state, {
    get(target, prop, receiver) {
        return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
        if (Reflect.set(target, prop, value, receiver)) {
            // udpate something
            return true;
        }
        return false;
    },
});
//# sourceMappingURL=state.js.map