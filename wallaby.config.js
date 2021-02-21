module.exports = function () {
	return {
	  files: [
		'client/**/*.ts',
		'client/testFixture/src/**/*.html',
		'server/**/*.ts',
		'**/tsconfig.json',
		'tests/unit/helpers/**/*.ts'
	  ],

	  tests: [
		// 'tests/unit/**/*.spec.ts',
		// 'tests/unit/**/*Map.spec.ts',
		'tests/unit/**/*Support.spec.ts',
	  ],

	  testFramework: 'mocha',
	  env: {
		type: 'node'
	  },
	  debug: true
	};
  };