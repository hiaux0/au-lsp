import { customElement } from "aurelia";
import template from "./minimal-component.html";

@customElement({
  name: "minimal-component",
  template,
})
export class MinimalComponent {
  /** minimal */
  minimalVar: string = "minimal";
}
