import * as ts from "typescript";
import { CompletionItemKind } from "vscode-languageserver";

interface ClassInfoData {
  node: ts.Node;
  name: string;
  documentation: string;
  types: string;
  outGoingCalls?: ClassInfo;
}

interface ClassInfo {
  [name: string]: ClassInfoData;
}

export function createDiagram(
  classDeclaration: ts.ClassDeclaration,
  checker: ts.TypeChecker
) {
  let classMembers: string[] = [];
  const classMethods: ClassInfo = {};
  const classVariables: ClassInfo = {};

  // 1. Parse class members (for diagram creation)
  classDeclaration.forEachChild((classMember) => {
    if (
      ts.isPropertyDeclaration(classMember) ||
      ts.isMethodDeclaration(classMember)
    ) {
      const classMemberName = classMember.name?.getText();
      classMembers.push(classMemberName);

      // Get bindable type. If bindable type is undefined, we set it to be "unknown".
      const memberType =
        classMember.type?.getText() !== undefined
          ? classMember.type?.getText()
          : "";

      // Add comment documentation if available
      const symbol = checker.getSymbolAtLocation(classMember.name);
      const commentDoc = ts
        .displayPartsToString(symbol?.getDocumentationComment(checker))
        // Replace, else diagram breaks (evaluates new comment line as class member)
        .replace("\n", " ");

      let defaultValueText: string = "";
      if (ts.isPropertyDeclaration(classMember)) {
        // Add default values. The value can be undefined, but that is correct in most cases.
        const defaultValue = classMember.initializer?.getText();
        defaultValueText = `Default value: \`${defaultValue}\``;
      }

      // Concatenate documentation parts with spacing
      // const documentation = `${commentDoc}\n\n${memberTypeText}\n\n${defaultValueText}`;

      const kind: CompletionItemKind = ts.isPropertyDeclaration(classMember)
        ? CompletionItemKind.Variable
        : CompletionItemKind.Method;

      switch (kind) {
        case CompletionItemKind.Variable: {
          classVariables[classMemberName] = {
            node: classMember,
            name: classMemberName,
            documentation: commentDoc,
            types: memberType,
          };
          break;
        }
        case CompletionItemKind.Method: {
          classMethods[classMemberName] = {
            node: classMember,
            name: classMemberName,
            documentation: commentDoc,
            types: memberType,
          };

          classMember.forEachChild((methodBodyMember) => {
            const result = methodBodyMember.getText();
            result;
          });
          break;
        }
      }
    }
  });

  // 2. Assemble uml string
  const className = classDeclaration.name?.getText()!;
  const assembledString = assembleUmlString({
    className,
    classMethods,
    classVariables,
  });
  return assembledString;
}

/**
 * First iteration: mermaid-js markdown.
 */
function assembleUmlString({
  className,
  classMethods,
  classVariables,
}: {
  className: string;
  classMethods: ClassInfo;
  classVariables: ClassInfo;
}) {
  const classMethodsData = Object.values(classMethods);
  const classVariablesData = Object.values(classVariables);
  // const mermaidMdStringStart = '\`\`\`mermaid\n  classDiagram';
  const mermaidMdStringStart = "    classDiagram";
  const classNameStringStart = `class ${className} {`;
  const classNameStringEnd = "}\n";
  // const mermaidMdStringEnd = '\`\`\`';
  const mermaidMdStringEnd = "";

  // 1. Class variables
  const classVariablesString = classVariablesData.reduce(
    (acc, classInfo, index) => {
      const { name, types, documentation } = classInfo;
      return `${acc}
	${name}: ${types} // ${documentation} [${index}]`;
    },
    "------------------------------ Class variables\n--------"
  );

  // 2. Class methods
  const classMethodsString = classMethodsData.reduce(
    (acc, classInfo, index) => {
      const { node, name, types, documentation } = classInfo;
      // 1. Call hierarchy
      let classMemberStatements: any = {};
      node.forEachChild((methodBodyStatement) => {
        const children = methodBodyStatement.getChildren();
        // 1.1 Find references within class
        children.forEach((child) => {
          const childText = child.getText();
          if (!childText.includes("this.")) return;
          // 1.1.1 Iterate over all class members to find reference
          [...classMethodsData, ...classVariablesData].forEach(
            (classMember) => {
              const classMemberRegex = new RegExp(
                `(this.${classMember.name})(?:\\W)`
              );
              const isClassMember = childText.match(classMemberRegex);
              // const isClassMember = childText.includes(`this.${classMember.name}`)
              if (!isClassMember) return;
              classMemberStatements[classMember.name] = classMember;
            }
          );
          // 1.1.2 Assign found reference
          classInfo.outGoingCalls = classMemberStatements;
        });
      });

      // 2. Class members
      const methodIndex = classVariablesData.length + index;
      return `${acc}
	${name}(): ${types} // ${documentation} [${methodIndex}]`;
    },
    "------------------------------ Class methods\n--------"
  );

  // 3. Class methods call hierarchy
  const produceParentClassName = (name: string, index: number) =>
    `${className}_${name}`;

  const callHierarchyDiagram = classMethodsData.reduce((acc, method) => {
    // 3.1 Create classes for (called) methods and their dependencies
    let callHierarchyOfMethod = "";
    if (!method.outGoingCalls) return acc;

    // class $className_$methodName_$index { }
    callHierarchyOfMethod += `%% ------------------------------ ${method.name}
%%------
	class ${produceParentClassNameWithMemberIndex(method)}{ }`;
    // MyCompoCustomElement_foo__0 --|> MyCompoCustomElement_bar__1
    callHierarchyOfMethod += Object.values(method.outGoingCalls).reduce(
      (acc, outGoingCall) => {
        return `${acc}
	${produceParentClassNameWithMemberIndex(
    method
  )} --|> ${produceParentClassNameWithMemberIndex(outGoingCall)}`;
      },
      ""
    );
    return `${acc}

${callHierarchyOfMethod}`;

    /**
     * MyCompoCustomElement_bar__1
     */
    function produceParentClassNameWithMemberIndex(
      outGoingCall: ClassInfoData
    ) {
      const name = outGoingCall.name;
      const classMethodNames = Object.keys(classMethods);
      const classVariableNames = Object.keys(classVariables);

      const methodIndex = classMethodNames.findIndex(
        (classMethodName) => classMethodName === name
      );
      let variableIndex = classVariableNames.findIndex(
        (classVariableName) => classVariableName === name
      );

      let index = 0;
      if (variableIndex === -1) {
        index = Object.keys(classVariables).length + methodIndex;
      } else {
        index = variableIndex;
      }

      const result = `${className}_${name}_${index}`;
      return result;
    }
  }, "");

  const result =
    "\n" +
    mermaidMdStringStart +
    "\n    " +
    classNameStringStart +
    "\n" +
    classVariablesString +
    "\n\n" +
    classMethodsString +
    "\n" +
    classNameStringEnd +
    callHierarchyDiagram +
    "\n" +
    mermaidMdStringEnd;

  return result;
}
