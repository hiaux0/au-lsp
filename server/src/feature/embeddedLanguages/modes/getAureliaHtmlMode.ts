import { TextDocumentPositionParams } from 'vscode-languageserver';

import { LanguageMode, TextDocument } from '../languageModes';
import { aureliaProgram } from '../../../viewModel/AureliaProgram';

export function getAureliaHtmlMode(): LanguageMode {
  return {
    getId() {
      return 'html';
    },
    async doComplete(
      document: TextDocument,
      _textDocumentPosition: TextDocumentPositionParams,
      triggerCharacter: string | undefined
    ) {
      if (triggerCharacter === '<') {
        return [
          ...aureliaProgram.getComponentCompletionsMap().classDeclarations!,
        ];
      }
      return [];
    },
    onDocumentRemoved(_document: TextDocument) {},
    dispose() {},
  };
}
