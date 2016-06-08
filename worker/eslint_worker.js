define(function(require, exports, module) {
    var baseHandler = require("plugins/c9.ide.language/base_handler");
    var handler = module.exports = Object.create(baseHandler);
    var workerUtil = require("plugins/c9.ide.language/worker_util");
    
    handler.handlesLanguage = function(language) {
        return language === "javascript" || language === "jsx";
    };

    var path = require("plugins/c9.ide.language.javascript.infer/path");
    
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
        }, 3000)
        
        var cmd = "echo \""+docValue.replace(/([\\"$`])/g, "\\$1")+"\" | eslint_d --parser=babel-eslint --stdin --format=json --stdin-filename " + filePath.replace(/([^a-zA-Z0-9_\/~.-])/g, "\\$1")
        workerUtil.execFile(
            "bash",
            {
                args: ["-c", cmd],
                maxCallInterval: 50,
                timeout: 4000,
            },
            function(err, stdout, stderr) {
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
                        markers.push({
                            pos: { sl: m.line - 1, sc: m.column - 1, ec: m.column - 1 + m.source.length },
                            message: m.message,
                            level: m.severity === 1 ? "warning" : "error",
                        })
                    })
                });
    
                callback(markers);
            }
        );
    };
    
});
