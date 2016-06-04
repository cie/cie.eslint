define(function(require, exports, module) {
    main.consumes = ["language", "Plugin"];
    main.provides = ["eslint"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var plugin = new Plugin("eslint", main.consumes);
        var language = imports.language;

        plugin.on("load", function () {
            language.unregisterLanguageHandler("plugins/c9.ide.language.javascript.eslint/worker/eslint_worker");
            language.registerLanguageHandler("plugins/cie.eslint/worker/eslint_worker");
        });
        plugin.on("unload", function () {
            language.unregisterLanguageHandler("plugins/cie.eslint/worker/eslint_worker");
            language.registerLanguageHandler("plugins/c9.ide.language.javascript.eslint/worker/eslint_worker");
        });
        register(null, { eslint: plugin });
    }
});