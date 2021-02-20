import 'reflect-metadata';
import { Container } from 'aurelia-dependency-injection';
import { strictEqual } from 'assert';
import * as path from 'path';

import { AureliaProgram } from '../../../server/src/viewModel/AureliaProgram';
import { createAureliaWatchProgram } from '../../../server/src/viewModel/createAureliaWatchProgram';
import { CompletionItemKind } from 'vscode-html-languageservice';

// const testAureliaProgram = new AureliaProgram();

export function getAureliaProgramForTesting(): AureliaProgram {
  const container = new Container();
  const aureliaProgram = container.get(AureliaProgram);
  const sourceDirectory = path.resolve(
    __dirname,
    '../../../client/testFixture'
  );

  void createAureliaWatchProgram(aureliaProgram, {
    sourceDirectory,
    include: ['src/realdworld-advanced'],
  });
  return aureliaProgram;
}

let testAureliaProgram: AureliaProgram;
describe('Aurelia Component Map', () => {
  before(() => {
    testAureliaProgram = getAureliaProgramForTesting();
  });

  it('setAureliaComponentMap', () => {
    const componentMap = testAureliaProgram.getComponentMap();
    strictEqual(componentMap.bindables?.length, 0);

    strictEqual(componentMap.classDeclarations?.length, 1);
    strictEqual(componentMap.classDeclarations[0].kind, CompletionItemKind.Class);

    strictEqual(componentMap.classMembers?.length, 6);

    const variables = componentMap.classMembers.filter(classMember => classMember.kind === CompletionItemKind.Field);
    strictEqual(variables?.length, 2);

    const methods = componentMap.classMembers.filter(classMember => classMember.kind === CompletionItemKind.Method);
    strictEqual(methods?.length, 4);
  });
});
