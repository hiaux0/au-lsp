import ts = require('typescript');
import { AureliaProgram } from './AureliaProgram';

const updateAureliaComponents = async () => {
	// const fileProcessor = new ProcessFiles();
	// await fileProcessor.processPath(extensionSettings);
	// aureliaProgram.components = fileProcessor.components;

	// console.log('>>> The extension found this many components:');
	// console.log(aureliaProgram.components.length);
};

export async function createAureliaWatchProgram(aureliaProgram: AureliaProgram) {
	console.log("TCL: createAureliaWatchProgram -> createAureliaWatchProgram")
	// 1. Define/default path/to/tsconfig.json
	let configPath = ts.findConfigFile(
		/* searchPath */ "./",
		ts.sys.fileExists,
		"tsconfig.json"
	);
	if (configPath === undefined) {
		configPath = '../../tsconfig.json'; // use config file from the extension as default
	}

	// 2. Skip watcher if no tsconfig found
	const isCreateWatchProgram = configPath !== undefined;
	console.log("TCL: createAureliaWatchProgram -> configPath", configPath)
	if (isCreateWatchProgram) {
		console.log(">>> 1.4 Initiating a watcher for documentation and fetching changes in custom components");
		const createProgram = ts.createSemanticDiagnosticsBuilderProgram;


		// const sourceDirectory = ts.sys.getCurrentDirectory();
		// // const paths = host.readDirectory(sourceDirectory, ['ts', 'js', 'html'], ['node_modules', 'aurelia_project'], extensionSettings.pathToAureliaProject);
		// const paths = ts.sys.readDirectory(sourceDirectory, ['ts', 'js', 'html'], ['node_modules', 'aurelia_project'], ['src']);
		const host = ts.createWatchCompilerHost(
			configPath,
			// paths,
			{},
			ts.sys,
			createProgram,
		);

		// 2.1 We hook into createProgram to enable manual update of AureliaComponents of the application
		// upon changes. We also need to call the original createProgram to fulfill the lifecycle of the host.
		const origCreateProgram = host.createProgram;
		host.createProgram = (rootNames: readonly string[] | undefined, options, programHost, oldProgram) => {
			console.log('-------------- Custom Action ---------------------')
			aureliaProgram
			// Call update on AureliaComponents to ensure that the custom components are in sync
			// updateAureliaComponents().catch((err) => {
			// 	console.error(`Failed to update aurelia components ${JSON.stringify(err)}`);
			// });
			return origCreateProgram(rootNames, options, programHost, oldProgram);
		};
		// 2.2 We also overwrite afterProgramCreate to avoid actually running a compile towards the file system
		host.afterProgramCreate = program => {
			aureliaProgram.watcherProgram = program;
		};



		// console.log("TCL: createAureliaWatchProgram -> paths", paths)
		// 2.3 Create initial watch program with our specially crafted host for aurelia component handling
		ts.createWatchProgram(host);
	} else {
		console.log("Not tsconfig file found. The watcher needs a working tsconfig file to");
	}

	// 3 .To avoid an extra call to the AureliaComponents mapping we check whether the host has been created
	console.log("TCL: createAureliaWatchProgram -> isCreateWatchProgram", isCreateWatchProgram)
	if (!isCreateWatchProgram) {
		await updateAureliaComponents();
	}
}