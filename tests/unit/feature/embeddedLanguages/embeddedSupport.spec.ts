import 'reflect-metadata';
import { strictEqual } from 'assert';
import * as fs from 'fs';

import { AureliaProgram } from '../../../../server/src/viewModel/AureliaProgram';
import { CompletionItemKind, TextDocument } from 'vscode-html-languageservice';
import { getAureliaProgramForTesting } from '../../helpers/test-setup';
import { parseDocumentRegions, ViewRegionType } from '../../../../server/src/feature/embeddedLanguages/embeddedSupport';

let testAureliaProgram: AureliaProgram;
describe('embeddedSupport.ts', () => {
  before(() => {
    testAureliaProgram = getAureliaProgramForTesting([
      'src/realdworld-advanced',
    ]);
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

    strictEqual(regions.length, 6)

    const attributeRegions = regions.filter(region => region.type === ViewRegionType.Attribute);
    strictEqual(attributeRegions.length, 6)
  });
});
