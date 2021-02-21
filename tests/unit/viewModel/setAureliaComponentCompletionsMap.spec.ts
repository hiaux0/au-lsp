import 'reflect-metadata';
import { strictEqual } from 'assert';

import { AureliaProgram } from '../../../server/src/viewModel/AureliaProgram';
import { CompletionItemKind } from 'vscode-html-languageservice';
import { getAureliaProgramForTesting } from '../helpers/test-setup';

let testAureliaProgram: AureliaProgram;
describe('Aurelia Component Map', () => {
  before(() => {
    testAureliaProgram = getAureliaProgramForTesting([
      'src/realdworld-advanced',
    ]);
  });

  it('setAureliaComponentCompletionsMap', () => {
    const componentCompletionsMap = testAureliaProgram.getComponentCompletionsMap();
    strictEqual(componentCompletionsMap.bindables?.length, 0);

    strictEqual(componentCompletionsMap.classDeclarations?.length, 1);
    strictEqual(
      componentCompletionsMap.classDeclarations[0].kind,
      CompletionItemKind.Class
    );

    strictEqual(componentCompletionsMap.classMembers?.length, 6);

    const variables = componentCompletionsMap.classMembers.filter(
      (classMember) => classMember.kind === CompletionItemKind.Field
    );
    strictEqual(variables?.length, 2);

    const methods = componentCompletionsMap.classMembers.filter(
      (classMember) => classMember.kind === CompletionItemKind.Method
    );
    strictEqual(methods?.length, 4);
  });
});
