import { bindable } from "aurelia-framework";

interface ICompoInter {
  stringInter: string;
}

class CustomError extends Error {
  constructor() {
    super()
  }
}

/**
 * Docs for MyCompoCustomElement
 */
export class MyCompoCustomElement {
  /**
   * A bindable for strings
   */
  @bindable public stringBindable: string = 'foo';

  @bindable public interBindable: ICompoInter = {
    stringInter: 'stringInter',
  };

  private stringArray: string[] = ['hello', 'world'];

  /**
   * Here doc it
   */
  private oneOtherMethod() {

  }
}
