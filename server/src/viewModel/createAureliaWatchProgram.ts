import ts = require("typescript");
import { AureliaProgram } from "./AureliaProgram";
import { getAureliaComponentList } from "./getAureliaComponentList";
import { setAureliaComponentMap } from "./setAureliaComponentMap";

const updateAureliaComponents = (aureliaProgram: AureliaProgram): void => {
  /** Think this is not obsolete */
  setAureliaComponentMap(aureliaProgram);

  const componentList = getAureliaComponentList(aureliaProgram);

  if (componentList) {
    aureliaProgram.setComponentList(componentList);
    console.log(`>>> The extension found this many components: ${componentList.length}`);
    if (componentList.length < 10) {
      componentList.forEach((component, index) => {
        console.log(`${index} - ${component.filePath}`)
      })
    }
  } else {
    console.log("[WARNING]: No components found");
  }
};

export async function createAureliaWatchProgram(
  aureliaProgram: AureliaProgram,
  sourceDirectory?: string
) {
  // 1. Define/default path/to/tsconfig.json
  sourceDirectory = sourceDirectory || ts.sys.getCurrentDirectory();
  let configPath = ts.findConfigFile(
    // /* searchPath */ "./",
    /* searchPath */ sourceDirectory,
    ts.sys.fileExists,
    "tsconfig.json"
  );
  if (configPath === undefined) {
    configPath = "../../tsconfig.json"; // use config file from the extension as default
  }

  // 2. Skip watcher if no tsconfig found
  const isCreateWatchProgram = configPath !== undefined;
  if (isCreateWatchProgram) {
    console.log(
      "[carw.ts] 3.4 Initiating a watcher for documentation and fetching changes in custom components"
    );
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

    const host = ts.createWatchCompilerHost(
      configPath,
      {},
      ts.sys,
      createProgram
    );

    // 2.1 We hook into createProgram to enable manual update of AureliaComponents of the application
    // upon changes. We also need to call the original createProgram to fulfill the lifecycle of the host.
    const origCreateProgram = host.createProgram;
    host.createProgram = (
      rootNames: readonly string[] | undefined,
      options,
      programHost,
      oldProgram
    ) => {
      console.log("-------------- Custom Action ---------------------");
      return origCreateProgram(rootNames, options, programHost, oldProgram);
    };
    // 2.2 We also overwrite afterProgramCreate to avoid actually running a compile towards the file system
    host.afterProgramCreate = (builderProgram) => {
      aureliaProgram.setBuilderProgram(builderProgram);
      updateAureliaComponents(aureliaProgram);
    };

    // 2.3 Create initial watch program with our specially crafted host for aurelia component handling
    ts.createWatchProgram(host);
  } else {
    console.log(
      "Not tsconfig file found. The watcher needs a working tsconfig file to"
    );
  }

  /** init call */
  // updateAureliaComponents(aureliaProgram);

  // 3 .To avoid an extra call to the AureliaComponents mapping we check whether the host has been created
  if (!isCreateWatchProgram) {
    await updateAureliaComponents(aureliaProgram);
  }
}
