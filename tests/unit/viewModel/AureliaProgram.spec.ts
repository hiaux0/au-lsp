import 'reflect-metadata';
import { strictEqual } from 'assert';

import { AureliaProgram } from '../../../server/src/viewModel/AureliaProgram';
import { getAureliaProgramForTesting } from '../helpers/test-setup';
import { AureliaClassTypes } from '../../../server/src/common/constants';

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
    console.log('TCL: componentList', componentList);

    strictEqual(componentList.length, 1);
    strictEqual(componentList[0].className, 'SettingsViewCustomElement');
    strictEqual(componentList[0].componentName, 'settings-view');
    strictEqual(componentList[0].baseViewModelFileName, 'index');
    strictEqual(componentList[0].type, AureliaClassTypes.CUSTOM_ELEMENT);
  });
});
