module.exports = function () {
	return {
	  files: [
		'client/**/*.ts',
		'server/**/*.ts',
		'**/tsconfig.json',
		'tests/unit/helpers/**/*.ts'
	  ],

	  tests: [
		// 'tests/unit/**/*.spec.ts',
		'tests/unit/**/*Map.spec.ts',
	  ],

	  testFramework: 'mocha',
	  env: {
		type: 'node'
	  },
	  debug: true
	};
  };