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
        workerUtil.execAnalysis(
            "bash",
            {
                mode: "stdin",
                args: ["-c", "eslint --stdin --format=json --stdin-filename " + filePath.replace(/([^a-zA-Z0-9_\/~.-])/g, "\\$1")],
                maxCallInterval: 1200,
            },
            function(err, stdout, stderr) {
                if (err && err.code !== 255) return callback(err);
                if (typeof stdout === "string") return callback(new Error(stdout + stderr));
    
                
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
