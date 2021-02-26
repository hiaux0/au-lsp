module.exports = function () {
  return {
    files: [
      "client/**/*.ts",
      "client/testFixture/src/**/*.html",
      "server/**/*.ts",
      "**/tsconfig.json",
      "tests/unit/helpers/**/*.ts",
    ],

    tests: [
      // 'tests/unit/**/*.spec.ts',
      // 'tests/unit/**/*Map.spec.ts',
      // 'tests/unit/**/*embeddedSupport.spec.ts',
      // "tests/unit/**/languageModes.spec.ts",
      "tests/unit/feature/embeddedLanguages/modes.spec.ts",
      // 'tests/unit/**/AureliaProgram.spec.ts',
    ],

    testFramework: "mocha",
    env: {
      type: "node",
    },
    debug: true,
  };
};
