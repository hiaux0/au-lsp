import { singleton } from 'aurelia-dependency-injection';
import * as ts from 'typescript';

interface IWebcomponent {

}

/**
 * The AureliaProgram class represents your whole applicaton
 * (aka. program in typescript terminology)
 */
@singleton()
export class AureliaProgram {
	public components: IWebcomponent[] = [];
	public watcherProgram: ts.SemanticDiagnosticsBuilderProgram | undefined;

  /**
   * getProgram gets the current program
   *
   * The program may be undefined if no watcher is present or no program has been initiated yet.
   *
   * This program can change from each call as the program is fetched
   * from the watcher which will listen to IO changes in the tsconfig.
   */
	public getProgram(): ts.Program | undefined {
		if (this.watcherProgram !== undefined) {
			return this.watcherProgram.getProgram();
		} else {
			return undefined;
		}
	}
}
