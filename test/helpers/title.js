"use strict";

exports.getTitle = function (context) {
    var title = "";
    while (context) {
        if (context.title) {
            if (title) title = " - " + title;
            title = context.title + title;
        }
        context = context.parent;
    }
    return title;
};
