import * as ts from "typescript";

export interface VirtualSourceFileInfo {
  targetVirtualSourcefile: ts.SourceFile;
  virtualCursorIndex: number;
  viewModelFilePath?: string;
}

export const VIRTUAL_SOURCE_FILENAME = "virtual.ts";
const VIRTUAL_METHOD_NAME = "__vir";

/**
 * With a virtual file, get access to file scope juicyness via a virtual progrm.
 *
 * 1. In the virtual view model source file
 * 2. Split up
 *   2.1 Need to visit each node
 *   2.2 (or are we regexing it?)
 *
 * @param virtualViewModelSourceFile
 * @param virtualContent
 * @param customElementClassName Name of the class associated to your view
 */
export function createVirtualSourceFile(
  virtualViewModelSourceFile: ts.SourceFile,
  virtualContent: string,
  customElementClassName: string
): VirtualSourceFileInfo {
  /** Match [...] export class MyCustomElement { [...] */
  const virtualViewModelContent = virtualViewModelSourceFile.getText();
  const classDeclaration = "class ";
  const classNameToOpeningBracketRegex = new RegExp(
    `${classDeclaration}${customElementClassName}(.*?{)`
  );
  const classNameAndOpeningBracketMatch = classNameToOpeningBracketRegex.exec(
    virtualViewModelContent
  );
  if (!classNameAndOpeningBracketMatch) {
    throw new Error(
      `No match found in File: ${virtualViewModelSourceFile.fileName} with target class name: ${customElementClassName}`
    );
  }

  /** class Foo >{<-- index */
  const classNameStartIndex = classNameAndOpeningBracketMatch?.index;
  const toOpeningBracketLength = classNameAndOpeningBracketMatch[1]?.length;
  const classOpeningBracketIndex =
    classDeclaration.length +
    customElementClassName.length +
    classNameStartIndex +
    toOpeningBracketLength;

  /** Split on class MyClass >{< ..otherContent */
  const starter = virtualViewModelContent.slice(0, classOpeningBracketIndex);
  const ender = virtualViewModelContent.slice(classOpeningBracketIndex);

  /**  Create temp content */
  const tempMethodTextStart = `${VIRTUAL_METHOD_NAME}() {this.`;
  const tempMethodTextEnd = "};\n  ";
  const tempMethodText =
    tempMethodTextStart + virtualContent + tempMethodTextEnd;
  const tempWithContent = starter + tempMethodText + ender;

  const targetVirtualSourcefile = ts.createSourceFile(
    VIRTUAL_SOURCE_FILENAME,
    tempWithContent,
    99
  );

  const virtualCursorIndex =
    classOpeningBracketIndex +
    tempMethodTextStart.length +
    virtualContent.length;

  return {
    targetVirtualSourcefile,
    virtualCursorIndex,
  };
}
