// Bumps package.json's version and writes js/build-info.js with the same
// value, baked at CI build time so the renderer can compare against the
// latest GitHub release. Reads BUILD_VERSION from env.
//
// Cross-platform: avoids inline `node -e "..."` shell-escaping issues that
// were causing both Mac and Windows runners to fail.
const fs = require("fs");
const path = require("path");

const version = process.env.BUILD_VERSION;
if (!version) {
  console.error("BUILD_VERSION env var is required");
  process.exit(1);
}

const pkgPath = path.resolve(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

const buildInfoPath = path.resolve(__dirname, "..", "js", "build-info.js");
fs.writeFileSync(
  buildInfoPath,
  "// Generated at build time by GitHub Actions.\n" +
    'window.BUILD_VERSION = "' + version + '";\n'
);

console.log("Bumped to", version);
