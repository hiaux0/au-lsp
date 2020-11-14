import { kebabCase } from "@aurelia/kernel";
import * as ts from "typescript";
import { CUSTOM_ELEMENT_SUFFIX } from "./constants";

/**
 * Fetches the equivalent component name based on the given class declaration
 *
 * @param sourceFile - The class declaration to map a component name from
 */
export function getElementNameFromClassDeclaration(
  classDeclaration: ts.ClassDeclaration
): string {
  const className = classDeclaration.name?.getText() || "";
  const withoutCustomElementSuffix = className.replace(
    CUSTOM_ELEMENT_SUFFIX,
    ""
  );
  return kebabCase(withoutCustomElementSuffix);
}
