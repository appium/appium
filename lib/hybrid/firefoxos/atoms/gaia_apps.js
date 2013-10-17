/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var GaiaApps = {

  normalizeName: function(name) {
    return name.replace(/[- ]+/g, '').toLowerCase();
  },

  getRunningApps: function() {
    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    // Return a simplified version of the runningApps object which can be
    // JSON-serialized.
    let apps = {};
    for (let app in runningApps) {
        let anApp = {};
        for (let key in runningApps[app]) {
            if (["name", "origin", "manifest"].indexOf(key) > -1) {
                anApp[key] = runningApps[app][key];
            }
        }
        apps[app] = anApp;
    }
    return apps;
  },

  getRunningAppOrigin: function(name) {
    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    let origin;

    for (let property in runningApps) {
      if (runningApps[property].name == name) {
        origin = property;
      }
    }

    return origin;
  },

  getPermission: function(appName, permissionName) {
    GaiaApps.locateWithName(appName, function(app) {
      console.log("Getting permission '" + permissionName + "' for " + appName);
      var mozPerms = navigator.mozPermissionSettings;
      var result = mozPerms.get(
        permissionName, app.manifestURL, app.origin, false
      );
      marionetteScriptFinished(result);
    });
  },

  setPermission: function(appName, permissionName, value) {
    GaiaApps.locateWithName(appName, function(app) {
      console.log("Setting permission '" + permissionName + "' for " +
        appName + "to '" + value + "'");
      var mozPerms = navigator.mozPermissionSettings;
      mozPerms.set(
        permissionName, value, app.manifestURL, app.origin, false
      );
      marionetteScriptFinished();
    });
  },

  locateWithName: function(name, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    function sendResponse(app, appName, entryPoint) {
      if (callback === marionetteScriptFinished) {
        if (typeof(app) === 'object') {
          var result = {
            name: app.manifest.name,
            origin: app.origin,
            entryPoint: entryPoint || null,
            normalizedName: appName
          };
          callback(result);
        } else {
          callback(false);
        }
      } else {
        callback(app, appName, entryPoint);
      }
    }

    let appsReq = navigator.mozApps.mgmt.getAll();
    appsReq.onsuccess = function() {
      let apps = appsReq.result;
      let normalizedSearchName = GaiaApps.normalizeName(name);

      for (let i = 0; i < apps.length; i++) {
        let app = apps[i];
        let origin = null;
        let entryPoints = app.manifest.entry_points;
        if (entryPoints) {
          for (let ep in entryPoints) {
            let currentEntryPoint = entryPoints[ep];
            let appName = currentEntryPoint.name;

            if (normalizedSearchName === GaiaApps.normalizeName(appName)) {
              return sendResponse(app, appName, ep);
            }
          }
        } else {
          let appName = app.manifest.name;

          if (normalizedSearchName === GaiaApps.normalizeName(appName)) {
            return sendResponse(app, appName);
          }
        }
      }
      callback(false);
    }
  },

  // Returns the number of running apps.
  numRunningApps: function() {
    let count = 0;
    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    for (let origin in runningApps) {
      count++;
    }
    return count;
  },

  // Kills the specified app.
  kill: function(aOrigin, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    if (!runningApps.hasOwnProperty(aOrigin)) {
      callback(false);
    }
    else {
      window.addEventListener('appterminated', function gt_onAppTerminated() {
        window.removeEventListener('appterminated', gt_onAppTerminated);
        waitFor(
          function() {
            console.log("app with origin '" + aOrigin + "' has terminated");
            callback(true);
          },
          function() {
            let runningApps =
              window.wrappedJSObject.WindowManager.getRunningApps();
            return !runningApps.hasOwnProperty(aOrigin);
          }
        );
      });
      console.log("terminating app with origin '" + aOrigin + "'");
      window.wrappedJSObject.WindowManager.kill(aOrigin);
    }
  },

  // Kills all running apps, except the homescreen.
  killAll: function() {
    let originsToClose = [];
    let that = this;

    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    for (let origin in runningApps) {
      if (origin.indexOf('homescreen') == -1) {
        originsToClose.push(origin);
      }
    }

    if (!originsToClose.length) {
      marionetteScriptFinished(true);
      return;
    }

    originsToClose.slice(0).forEach(function(origin) {
      GaiaApps.kill(origin, function() {});
    });

    // Even after the 'appterminated' event has been fired for an app,
    // it can still exist in the apps list, so wait until 1 or fewer
    // apps are running (since we don't close the homescreen app).
    waitFor(
      function() { marionetteScriptFinished(true); },
      function() { return that.numRunningApps() <= 1; }
    );
  },

  // Launches app with the specified name (e.g., 'Calculator'); returns the
  // app frame's id if successful, false if the app can't be found, or times
  // out if the app frame can't be found after launching the app.
  launchWithName: function(name) {
    GaiaApps.locateWithName(name, function(app, appName, entryPoint) {
      if (app) {
        let windowManager = window.wrappedJSObject.WindowManager;
        let runningApps = windowManager.getRunningApps();
        let origin = GaiaApps.getRunningAppOrigin(appName);

        let sendResponse = function() {
          let app = runningApps[origin];
          let result = {frame: app.frame.firstChild,
            src: app.iframe.src,
            name: app.name,
            origin: origin};
          marionetteScriptFinished(result);
        };

        if (windowManager.getDisplayedApp() == origin) {
          console.log("app with origin '" + origin + "' is already running");
          sendResponse();
        }
        else {
          window.addEventListener('apploadtime', function apploadtime() {
            window.removeEventListener('apploadtime', apploadtime);
            waitFor(
              function() {
                console.log("app with origin '" + origin + "' has launched");
                sendResponse();
              },
              function() {
                origin = GaiaApps.getRunningAppOrigin(appName);
                return !!origin;
              }
            );
          });
          console.log("launching app with name '" + appName + "'");
          app.launch(entryPoint || null);
        }
      } else {
        marionetteScriptFinished(false);
      }
    });
  },

  /**
   * Uninstalls the app with the specified name.
   */
  uninstallWithName: function(name) {
    GaiaApps.locateWithName(name, function uninstall(app) {
      navigator.mozApps.mgmt.uninstall(app);
      marionetteScriptFinished(false);
    });
  }

};
