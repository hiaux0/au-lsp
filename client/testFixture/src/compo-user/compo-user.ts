import { bindable, customElement } from "aurelia-framework";

@customElement("compo-user")
export class CompoUser {
  @bindable thisIsMe: string = "hello";

  message: string = "compo user";

  counter: number = 0;

  increaseCounter(): number {
    return 1;
  }
}
