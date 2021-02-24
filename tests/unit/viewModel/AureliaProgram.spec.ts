import 'reflect-metadata';
import { strictEqual } from 'assert';

import { AureliaProgram } from '../../../server/src/viewModel/AureliaProgram';
import { getAureliaProgramForTesting } from '../helpers/test-setup';
import { AureliaClassTypes } from '../../../server/src/common/constants';
import { SyntaxKind } from 'typescript';

let testAureliaProgram: AureliaProgram;
describe('Aurelia Component Map', () => {
  before(() => {
    testAureliaProgram = getAureliaProgramForTesting({
      include: ['src/realdworld-advanced'],
    });
  });

  it('#initComponentList', () => {
    testAureliaProgram.initComponentList();

    const componentList = testAureliaProgram.getComponentList();

    strictEqual(componentList.length, 1);
    strictEqual(componentList[0].className, 'SettingsViewCustomElement');
    strictEqual(componentList[0].componentName, 'settings-view');
    strictEqual(componentList[0].baseViewModelFileName, 'index');
    strictEqual(componentList[0].type, AureliaClassTypes.CUSTOM_ELEMENT);
    //
    const { classMembers } = componentList[0];
    strictEqual(componentList[0].classMembers.length, 7);
    const bindables = classMembers.filter(member => member.isBindable);
    strictEqual(bindables.length, 0);
    const variables = classMembers.filter(member => member.syntaxKind === SyntaxKind.VariableDeclaration);
    strictEqual(variables.length, 2);
    const methods = classMembers.filter(member => member.syntaxKind === SyntaxKind.MethodDeclaration);
    strictEqual(methods.length, 5);
  });
});
