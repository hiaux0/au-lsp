export const CUSTOM_ELEMENT_SUFFIX = 'CustomElement';
export const VALUE_CONVERTER_SUFFIX = 'ValueConverter';

export const TEMPLATE_TAG_NAME = 'template';

export const VIRTUAL_SOURCE_FILENAME = 'virtual.ts';

export enum AureliaClassTypes {
  CUSTOM_ELEMENT = 'CustomElement',
  VALUE_CONVERTER = 'ValueConverter',
}

export enum AureliaViewModel {
  TO_VIEW = 'toView',
}

export enum AureliaView {
  IF = 'if',
  TEMPLATE_TAG_NAME = 'template',
  REPEAT_FOR = 'repeat.for',
  VALUE_CONVERTER_OPERATOR = '|',
  VALUE_CONVERTER_ARGUMENT = ':',
}

export enum AureliaLSP {
  /** [c]ompletion [i]tem [d]ata [t]ype -> cidt */
  AureliaCompletionItemDataType = 'AURELIA_CIDT',
}
