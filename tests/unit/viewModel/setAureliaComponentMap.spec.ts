import "reflect-metadata";
import { Container } from "aurelia-dependency-injection";
import { equal, ok, strictEqual } from "assert";
import { expect } from "chai";
import * as path from "path";

import { AureliaProgram } from "../../../server/src/viewModel/AureliaProgram";
import { createAureliaWatchProgram } from "../../../server/src/viewModel/createAureliaWatchProgram";

// const testAureliaProgram = new AureliaProgram();

export function getAureliaProgramForTesting() {
  const container = new Container();
  const aureliaProgram = container.get(AureliaProgram);
  const sourceDirectory = path.resolve(
    __dirname,
    "../../../client/testFixture"
  );

  createAureliaWatchProgram(aureliaProgram, {
    sourceDirectory,
    include: ["src/realdworld-advanced"],
  });
  return aureliaProgram;
}

let testAureliaProgram: AureliaProgram;
describe("Aurelia Component Map", () => {
  before(() => {
    testAureliaProgram = getAureliaProgramForTesting();
  });

  it("setAureliaComponentMap", () => {
    const componentMap = testAureliaProgram.getComponentMap();
    console.log('TCL: componentMap.bindables', componentMap.bindables)
    strictEqual(componentMap.bindables.length, 0);
  });
});
