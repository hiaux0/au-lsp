import { CUSTOM_ELEMENT_SUFFIX } from './../../server/src/common/constants';
import { strictEqual } from 'assert';

describe("Array", function () {
  describe("#indexOf()", function () {
    it("should return -1 when the value is not present", function () {
      strictEqual(CUSTOM_ELEMENT_SUFFIX, '');
    });
  });
});
