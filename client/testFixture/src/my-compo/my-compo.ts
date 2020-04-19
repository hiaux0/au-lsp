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
  @bindable public whhhhaaat: string = 'foo';


  @bindable public numberBindable: number = 123;

  @bindable public stringArrayBindable: string[] = ['hello', 'world'];

  @bindable public interBindable: ICompoInter = {
    stringInter: 'stringInter',
  };
}
