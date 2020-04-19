import { AureliaProgram } from './AureliaProgram';
import { sys, SourceFile } from 'typescript';
import * as Path from 'path';

export function createAureliaComponentMap(aureliaProgram: AureliaProgram) {
	const sourceDirectory = sys.getCurrentDirectory();
	const paths = sys.readDirectory(sourceDirectory, ['ts', 'js', 'html'], ['node_modules', 'aurelia_project'], ['src']);
	// const paths = sys.readDirectory(sourceDirectory, ['ts', 'js', 'html'], ['node_modules', 'aurelia_project'], extensionSettings.pathToAureliaProject);
	paths.forEach(path => {
		const ext = Path.extname(path);
		ext
		switch (ext) {
			case '.js':
			case '.ts': {
				const sourceFile = aureliaProgram.watcherProgram?.getProgram().getSourceFile(path)
				if (sourceFile === undefined) {
					console.log('Watcher program did not find file: ', path)
				}

				createAureliaViewModelMap(sourceFile!)
				break;
			}
			case '.html': {
				break
			}
			default: {
				console.log('Unsupported extension')
			}
		}
	});
}

function createAureliaViewModelMap(sourceFile: SourceFile) {
	sourceFile

}