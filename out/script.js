"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const releases_1 = require("./releases");
(async () => {
    const releases = await (0, releases_1.getAllReleases)({ withPrereleases: true });
    console.log(releases);
})();
//# sourceMappingURL=script.js.map