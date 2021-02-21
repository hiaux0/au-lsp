import 'reflect-metadata';
import { Container } from 'aurelia-dependency-injection';
import { strictEqual } from 'assert';
import * as path from 'path';

import { AureliaProgram } from '../../../server/src/viewModel/AureliaProgram';
import { createAureliaWatchProgram } from '../../../server/src/viewModel/createAureliaWatchProgram';
import { CompletionItemKind } from 'vscode-html-languageservice';

export function getAureliaProgramForTesting(include: string[]): AureliaProgram {
  const container = new Container();
  const aureliaProgram = container.get(AureliaProgram);
  const sourceDirectory = path.resolve(
    __dirname,
    '../../../client/testFixture'
  );

  createAureliaWatchProgram(aureliaProgram, {
    sourceDirectory,
    include,
  });
  return aureliaProgram;
}

let testAureliaProgram: AureliaProgram;
describe('Aurelia Component Map', () => {
  before(() => {
    testAureliaProgram = getAureliaProgramForTesting(['src/realdworld-advanced']);
  });

  it('setAureliaComponentCompletionsMap', () => {
    const componentCompletionsMap = testAureliaProgram.getComponentCompletionsMap();
    strictEqual(componentCompletionsMap.bindables?.length, 0);

    strictEqual(componentCompletionsMap.classDeclarations?.length, 1);
    strictEqual(componentCompletionsMap.classDeclarations[0].kind, CompletionItemKind.Class);

    strictEqual(componentCompletionsMap.classMembers?.length, 6);

    const variables = componentCompletionsMap.classMembers.filter(classMember => classMember.kind === CompletionItemKind.Field);
    strictEqual(variables?.length, 2);

    const methods = componentCompletionsMap.classMembers.filter(classMember => classMember.kind === CompletionItemKind.Method);
    strictEqual(methods?.length, 4);
  });
});
