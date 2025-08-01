// clean-unused.js
import depcheck from "depcheck";
import { exec } from "child_process";

const options = {};

depcheck(process.cwd(), options, (unused) => {
  const allUnused = [...(unused.dependencies || []), ...(unused.devDependencies || [])];

  if (allUnused.length === 0) {
    console.log("✅ No unused dependencies found.");
    return;
  }

  console.log("🚫 Unused dependencies:", allUnused.join(", "));

  // Build uninstall commands
  const uninstallProd = unused.dependencies.length
    ? `npm uninstall ${unused.dependencies.join(" ")}`
    : null;

  const uninstallDev = unused.devDependencies.length
    ? `npm uninstall --save-dev ${unused.devDependencies.join(" ")}`
    : null;

  if (uninstallProd) {
    console.log("🔧 Removing:", uninstallProd);
    exec(uninstallProd, (err, stdout, stderr) => {
      if (err) console.error(stderr);
      else console.log(stdout);
    });
  }

  if (uninstallDev) {
    console.log("🔧 Removing:", uninstallDev);
    exec(uninstallDev, (err, stdout, stderr) => {
      if (err) console.error(stderr);
      else console.log(stdout);
    });
  }
});
