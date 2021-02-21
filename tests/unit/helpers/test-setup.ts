import { Container } from 'aurelia-dependency-injection';
import * as path from 'path';
import { AureliaProgram } from '../../../server/src/viewModel/AureliaProgram';
import { createAureliaWatchProgram } from '../../../server/src/viewModel/createAureliaWatchProgram';

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
