module.exports = function () {
	return {
	  files: [
		'client/**/*.ts',
		'server/**/*.ts',
	  ],

	  tests: [
		'tests/unit/**/*.spec.ts',
	  ],

	  testFramework: 'mocha',
	  env: {
		type: 'node'
	  },
	  debug: true
	};
  };