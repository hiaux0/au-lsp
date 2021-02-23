import { defaultProjectOptions , IProjectOptions } from '../../../server/src/common/common.types';
import { Container } from 'aurelia-dependency-injection';
import * as path from 'path';

import { AureliaProgram } from '../../../server/src/viewModel/AureliaProgram';
import { createAureliaWatchProgram } from '../../../server/src/viewModel/createAureliaWatchProgram';

export function getAureliaProgramForTesting(
  projectOptions: IProjectOptions = defaultProjectOptions
): AureliaProgram {
  const container = new Container();
  const aureliaProgram = container.get(AureliaProgram);
  const sourceDirectory = path.resolve(
    __dirname,
    '../../../client/testFixture'
  );

  projectOptions.sourceDirectory = sourceDirectory;

  createAureliaWatchProgram(aureliaProgram, projectOptions);
  return aureliaProgram;
}
