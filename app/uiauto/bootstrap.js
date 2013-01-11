 /**
 *    Copyright 2012 Appium Committers
 *
 *    Licensed to the Apache Software Foundation (ASF) under one
 *    or more contributor license agreements.  See the NOTICE file
 *    distributed with this work for additional information
 *    regarding copyright ownership.  The ASF licenses this file
 *    to you under the Apache License, Version 2.0 (the
 *    "License"); you may not use this file except in compliance
 *    with the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing,
 *    software distributed under the License is distributed on an
 *    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *    KIND, either express or implied.  See the License for the
 *    specific language governing permissions and limitations
 *    under the License.
 */

#import "AppiumUtils.js"

/* ***** helper functions ***** */

// delay in seconds
function delay(secs)
{
    var date = new Date();
    var curDate = null;
    
    do { curDate = new Date(); }
    while(curDate-date < (secs * 1000.0));
} 

/* ***** main loop ***** */

// automation globals
var iosAutoPath = "$PATH_ROOT"
var target      = UIATarget.localTarget();
var application = target.frontMostApp();
var host = target.host();
var mainWindow  = application.mainWindow();
var wd_frame = mainWindow
var elements = {}
var bufferFlusher = [];
// 16384 is apprently the buffer size used by instruments
for (i=0; i < 16384; i++) {
    bufferFlusher.push('*');
}
bufferFlusher = bufferFlusher.join('');

// loop variables
var runLoop = true;
var instructionNumber = 0;

// Instruments default timeout is 5s, webdriver defaults to 0ms.
// Instruments needs a non-zero timeout to function properly. 1s seems to work.
// Tests should override this to a app-specific value that works.
target.setTimeout(1);

var instruction;

// main loop
while (runLoop)
{
    var instructionFile = iosAutoPath + instructionNumber.toString() + "-cmd.txt";
    var responseFile = iosAutoPath + instructionNumber.toString() + "-resp.txt";
    // NOTE: performTasksWithPathArgumentsTimeouts takes a minimum on one second, this is
    // the reason each selenium commands takes minimum of 2 seconds
    try {
        instruction = host.performTaskWithPathArgumentsTimeout("/bin/cat", [instructionFile], 5);
    } catch (e) {
        target.delay(0.5);
        continue;
    }
    if (instruction.exitCode == 0)
    {
        var resp = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<collection>\n";
        var instructionText = instruction.stdout;
        try
        {
            var jsCommands = instructionText.split('\n');
            for (var jsCommandIndex = 0; jsCommandIndex < jsCommands.length; jsCommandIndex++)
            {
                var jsCommand = jsCommands[jsCommandIndex];
                try
                {
                    UIALogger.logDebug(instructionNumber.toString() + "." + jsCommandIndex.toString() + " - Command   - " + jsCommand);
                       var evalResult = eval(jsCommand);
                       if (evalResult == null)
                       {
                           evalResult = "";
                       }
                    UIALogger.logDebug(instructionNumber.toString() + "." + jsCommandIndex.toString() + " - Response  - " + evalResult.toString());
                       resp = resp + "<response>" + "0," + evalResult.toString() + "</response>\n";
                }
                catch (err)
                {
                    UIALogger.logWarning("js command execution failed: " + err.description);
                    resp = resp + "<response>" + "-1," + err.description + "</response>\n";
                }
            }
        }
        catch (err)
        {
            UIALogger.logWarning("could not parse intruction set: " + err.description);
            resp = resp + "<error>could not parse intruction set</error>\n";
        }
        resp = resp + "</collection>\n";
        UIALogger.logMessage("START RESPONSE INSTRUCTION SET #" + instructionNumber.toString() + " _APPIUM_XML_RESPONSE:\n\n" + resp + 
            "\nEND INSTRUCTION SET #" + instructionNumber.toString());
          instructionNumber++;
        // Need to write out a large enough chunk of text in order for the stdout buffer to flush itself
        // since instruments doesn't appear to be flushing it themselves.
        UIALogger.logDebug(bufferFlusher);
        UIALogger.logDebug("BEGIN INSTRUCTION SET #" + instructionNumber.toString());
    }
}
