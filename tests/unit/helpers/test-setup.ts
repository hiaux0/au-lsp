import {
  defaultProjectOptions,
  IProjectOptions,
} from '../../../server/src/common/common.types';
import * as path from 'path';
import * as fs from 'fs';

import { AureliaProgram, globalContainer } from '../../../server/src/viewModel/AureliaProgram';
import { createAureliaWatchProgram } from '../../../server/src/viewModel/createAureliaWatchProgram';
import { TextDocument } from 'vscode-html-languageservice';
import { Container } from 'aurelia-dependency-injection';

export function getAureliaProgramForTesting(
  projectOptions: IProjectOptions = defaultProjectOptions
): AureliaProgram {
  const container: Container = globalContainer;
  const aureliaProgram = container.get(AureliaProgram);
  const sourceDirectory = path.resolve(
    __dirname,
    '../../testFixture'
  );

  projectOptions.sourceDirectory = sourceDirectory;
   sourceDirectory;/* ? */

  createAureliaWatchProgram(aureliaProgram, projectOptions);
  return aureliaProgram;
}

export function createTextDocumentForTesting(filePath: string): TextDocument {
  const uri = filePath;
  const content = fs.readFileSync(uri, 'utf-8');
  const document = TextDocument.create(uri, 'html', 99, content);
  return document;
}
