import 'reflect-metadata';
import { strictEqual } from 'assert';
import * as fs from 'fs';

import { AureliaProgram } from '../../../../server/src/viewModel/AureliaProgram';
import { CompletionItemKind, TextDocument } from 'vscode-html-languageservice';
import { getAureliaProgramForTesting } from '../../helpers/test-setup';
import {
  parseDocumentRegions,
  ViewRegionType,
} from '../../../../server/src/feature/embeddedLanguages/embeddedSupport';

let testAureliaProgram: AureliaProgram;
describe('embeddedSupport.ts', () => {
  before(() => {
    testAureliaProgram = getAureliaProgramForTesting({
      include: ['src/realdworld-advanced'],
    });
  });

  it('parseDocumentRegions', async () => {
    const componentCompletionsMap = testAureliaProgram.getComponentCompletionsMap();

    if (componentCompletionsMap.classDeclarations === undefined) return;
    if (componentCompletionsMap.classDeclarations?.length > 1) {
      return;
    }

    const data = componentCompletionsMap.classDeclarations[0].data as {
      templateImportPath: string;
    };
    const { templateImportPath } = data;

    const uri = templateImportPath;
    const content = fs.readFileSync(uri, 'utf-8');
    const document = TextDocument.create(uri, 'html', 99, content);
    const regions = await parseDocumentRegions(document, testAureliaProgram);

    strictEqual(regions.length, 8);

    const attributeRegions = regions.filter(
      (region) => region.type === ViewRegionType.Attribute
    );
    strictEqual(attributeRegions.length, 6);

    const attributeInterpolationRegions = regions.filter(
      (region) => region.type === ViewRegionType.AttributeInterpolation
    );
    strictEqual(attributeInterpolationRegions.length, 1);

    const textInterpolationRegions = regions.filter(
      (region) => region.type === ViewRegionType.TextInterpolation
    );
    strictEqual(textInterpolationRegions.length, 1);
  });

  it('parseDocumentRegions - set viewRegions to ComponentList', async () => {
    testAureliaProgram.initComponentList();
    const componentList = testAureliaProgram.getComponentList();

    if (componentList.length > 1) return;

    const targetComponent = componentList[0];

    const uri = targetComponent.viewFilePath ?? '';
    const content = fs.readFileSync(uri, 'utf-8');
    const document = TextDocument.create(uri, 'html', 99, content);
    const regions = await parseDocumentRegions(document, testAureliaProgram);

    testAureliaProgram.setViewRegions(
      targetComponent.componentName ?? '',
      regions
    );

    strictEqual(targetComponent.viewRegions?.length, 8);
  });
});
