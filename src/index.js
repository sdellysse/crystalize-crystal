/**
 * Copyright (c) 2016 Shawn Dellysse
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const createServer = require("http").createServer;
const getPath = require("./get-path");
const makeGroupProxy = require("./make-group-proxy");
const Group = require("crystalize-group");
const Route = require("crystalize-route");

const Crystal = function (cb) {
    this.Promise = Crystal.Promise;
    this._rootGroup.set(this, new Group());

    if (cb) {
        cb(this);
    }
};

Object.assign(Crystal, {
    errors: {
        MatchingRouteNotFoundError: require("./matching-route-not-found-error"),
    },
    Promise: require("crystal-promise").Promise,
});

// Take every method on the Group prototype and make a proxy method on this
// prototype to make it feel like a Crystal instance is also a Group instance.
for (let key of Object.keys(Group.prototype)) {
    if (typeof Group.prototype[key] === "function") {
        Crystal.prototype[key] = makeGroupProxy(key);
    }
}

Object.assign(Crystal.prototype, {
    compileRoutes: function () {
        return this.getRootGroup().collectRoutes().map(r => new Route(r.methods, r.path, r.handlers));
    },

    createServerCallback: function () {
        const routes = this.compileRoutes();

        return (req, res) => {
            let promise = null;

            req.path = getPath(req.url);

            const methodPath = `${ req.method } ${ req.path }`;
            for (let i = 0, l = routes.length; i < l; i++) {
                const route = routes[i];

                if (route.matches(methodPath)) {
                    req.route = route;

                    promise = route.runHandlers(req, res);
                    break;
                }
            }

            if (promise === null) {
                promise = this.Promise.reject(new Crystal.errors.MatchingRouteNotFoundError(req.method, req.path))
            }

            // Put a last-line-of-defense catcher on the promise chain.
            promise = promise.catch(error => process.emit("uncaughtException", error));

            return promise;
        };
    },

    getRootGroup: function () {
        return this._rootGroup;
    },

    listen: function (port) {
        return new this.Promise((resolve, reject) => {
            const server = createServer(this.createServerCallback());
            server.on("listening", () => resolve(server));
            server.on("error", err => reject(err));
            server.listen(port);
        });
    },
});

module.exports = Crystal;
