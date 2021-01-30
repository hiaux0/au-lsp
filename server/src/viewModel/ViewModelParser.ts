import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupKind,
  createConnection,
  IConnection,
} from "vscode-languageserver";
import * as ts from "typescript";
import { AureliaProgram } from "./AureliaProgram";
import { kebabCase } from "@aurelia/kernel";
import { getElementNameFromClassDeclaration } from "../common/className";

const connection: IConnection = createConnection();
const logger = connection.console;

/**
 * Get all the Custom elements from (based on aureliaProgram), and provide completion
 */
export class ViewModelParser {
  public create(aureliaProgram: AureliaProgram): CompletionItem[] {
    const result: CompletionItem[] = [];

    const program = aureliaProgram.getProgram();
    if (program !== undefined) {
      const checker = program.getTypeChecker();
      for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
          const fileNameNoExt = sourceFile.fileName.replace(/\.(ts|js)$/, "");
          const hasTemplate = ts.sys.fileExists(`${fileNameNoExt}.html`);

          sourceFile.forEachChild((node) => {
            if (
              ts.isClassDeclaration(node) &&
              this.isNodeExported(node) &&
              (hasTemplate || this.classDeclarationHasUseViewOrNoView(node))
            ) {
              const elementName = getElementNameFromClassDeclaration(node);
              const symbol = checker.getSymbolAtLocation(node);
              const documentation = ts.displayPartsToString(
                symbol?.getDocumentationComment(checker)
              );

              result.push({
                documentation: {
                  kind: MarkupKind.Markdown,
                  value: documentation,
                },
                detail: `${elementName}`,
                insertText: `${elementName}$2>$1</${elementName}>$0`,
                insertTextFormat: InsertTextFormat.Snippet,
                kind: CompletionItemKind.Property,
                label: `${elementName} (Au Custom Element)`,
              });
            }
          });
        }
      }
    } else {
      logger.log("CustomElement: Program missing, can't fetch documentation.");
    }

    return result;
  }

  /**
   * Fetches the equivalent component name based on the given class declaration
   *
   * @param sourceFile - The class declaration to map a component name from
   */
  private getElementNameFromClassDeclaration(
    classDeclaration: ts.ClassDeclaration
  ): string {
    const text = classDeclaration.name?.getText() || "";
    return kebabCase(text);
  }

  /**
   * classDeclarationHasUseViewOrNoView checks whether a classDeclaration has a useView or noView
   *
   * @param classDeclaration - ClassDeclaration to check
   */
  private classDeclarationHasUseViewOrNoView(
    classDeclaration: ts.ClassDeclaration
  ): boolean | undefined {
    return classDeclaration.decorators?.some((decorator) => {
      return (
        decorator.getText().includes("@useView") ||
        decorator.getText().includes("@noView")
      );
    });
  }

  private isNodeExported(node: ts.Declaration): boolean {
    return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
  }
}
