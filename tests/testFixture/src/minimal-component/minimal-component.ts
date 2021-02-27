import { customElement } from "aurelia";
import template from "./minimal-component.html";

interface MyInter {
  field: string;
}

@customElement({
  name: "minimal-component",
  template,
})
export class MinimalComponent {
  /** minimal */
  minimalVar: string = "minimal";

  minimalInterfaceVar: MyInter;
}
