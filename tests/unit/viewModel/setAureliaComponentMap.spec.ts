import "reflect-metadata";
import { Container } from "aurelia-dependency-injection";
import { strictEqual } from "assert";
import * as path from 'path';

import { AureliaProgram } from "../../../server/src/viewModel/AureliaProgram";
import { setAureliaComponentMap } from "../../../server/src/viewModel/setAureliaComponentMap";
import { createAureliaWatchProgram } from "../../../server/src/viewModel/createAureliaWatchProgram";

// const testAureliaProgram = new AureliaProgram();

export function getAureliaProgramForTesting() {
  const container = new Container();
  const aureliaProgram = container.get(AureliaProgram);
    const sourceDirectory = path.resolve(__dirname, "../../../client/testFixture");

  createAureliaWatchProgram(aureliaProgram, sourceDirectory);
  return aureliaProgram;
}

let testAureliaProgram: AureliaProgram;
describe("Aurelia Component Map", () => {
  before(() => {
    testAureliaProgram = getAureliaProgramForTesting();
  });

  it("setAureliaComponentMap", () => {
    const asht = testAureliaProgram.getComponentMap();
    asht /*?*/
    strictEqual(asht, { hi: "" });
  });
});
