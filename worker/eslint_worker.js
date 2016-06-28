define(function(require, exports, module) {
    var baseHandler = require("plugins/c9.ide.language/base_handler");
    var handler = module.exports = Object.create(baseHandler);
    var workerUtil = require("plugins/c9.ide.language/worker_util");
    
    handler.handlesLanguage = function(language) {
        return language === "javascript" || language === "jsx";
    };

    var path = require("plugins/c9.ide.language.javascript.infer/path");
    var working = false;
    
    handler.analyze = function(docValue, ast, callback) {
        var basePath = path.getBasePath(handler.path, handler.workspaceDir);
        var filePath = path.canonicalizePath(handler.path, basePath);
        if (filePath.startsWith("/")) filePath = handler.workspaceDir + filePath
        
        var dirname = require("path").dirname(filePath)
        
        var timeouted = false
        var finished = false
        setTimeout(function() {
            if (finished) return;
            timeouted = true;
            callback([{ pos: { sl: 0 }, message: "Eslint took too long to analyze.", level: "warning" }]);
        }, 4500)
        
        var cmd = "echo \""+docValue.replace(/([\\"$`])/g, "\\$1")+"\" | eslint_d --parser=babel-eslint --stdin --format=json --stdin-filename " + filePath.replace(/([^a-zA-Z0-9_\/~.-])/g, "\\$1")
        if (working) {
            callback([{ pos: { sl: 0 }, message: "Eslint is still initializing...", level: "warning" }]);
            return;
        }
        working = true;
        workerUtil.execFile(
            "bash",
            {
                args: ["-c", cmd],
                maxCallInterval: 50,
                timeout: 20000,
            },
            function(err, stdout, stderr) {
                working = false;
                if (timeouted) return;
                finished = true;
                if (err && err.code !== 255 && err.code !== 1 && err.code !== 2) return callback([{pos: {sl: 0}, message:e.message, level: "error"}]);
                try {
                    stdout = JSON.parse(stdout)
                } catch (e) {
                    return callback([{pos: {sl: 0}, message:stdout+stderr, level: "error"}]);
                }
                
                var markers = [];
                stdout.forEach(function(file) {
                    file.messages.forEach(function(m) {
                        const info = m.message.match(/too many|maximum line length|semicolon|multiple spaces|'else'/i)
                        const level = info ? 'info' : (m.severity === 1 ? "warning" : "error")
                        markers.push({
                            pos: { sl: m.line - 1, sc: m.column - 1, ec: m.column - 1 + m.source.length },
                            message: m.message,
                            type: level,
                            level: level,
                        })
                    })
                });
    
                callback(markers);
            }
        );
    };
    
});
