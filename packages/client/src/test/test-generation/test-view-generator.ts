// export enum AureliaView {
//   IF = "if",
//   TEMPLATE_TAG_NAME = "template",
//   REPEAT_FOR = "repeat.for",
//   VALUE_CONVERTER_OPERATOR = "|",
//   VALUE_CONVERTER_ARGUMENT = ":",
// }

// type HTMLElementTypes =
//   | "abbr"
//   | "acronym"
//   | "area"
//   | "b"
//   | "base"
//   | "basefont"
//   | "bdo"
//   | "big"
//   | "br"
//   | "button"
//   | "caption"
//   | "cite"
//   | "code"
//   | "col"
//   | "colgroup"
//   | "div"
//   | "del"
//   | "dfn"
//   | "em"
//   | "font"
//   | "head"
//   | "html"
//   | "i"
//   | "img"
//   | "input"
//   | "ins"
//   | "isindex"
//   | "kbd"
//   | "label"
//   | "legend"
//   | "li"
//   | "link"
//   | "map"
//   | "meta"
//   | "noscript"
//   | "optgroup"
//   | "option"
//   | "param"
//   | "q"
//   | "s"
//   | "samp"
//   | "script"
//   | "select"
//   | "small"
//   | "span"
//   | "strike"
//   | "strong"
//   | "style"
//   | "sub"
//   | "sup"
//   | "table"
//   | "tbody"
//   | "td"
//   | "template"
//   | "textarea"
//   | "tfoot"
//   | "th"
//   | "thead"
//   | "title"
//   | "tr"
//   | "tt"
//   | "u"
//   | "var;";
// //

// type AureliaAttributeBindings =
//   | "bind"
//   | "one-way"
//   | "two-way"
//   | "one-time"
//   | "from-view"
//   | "to-view"
//   | "delegate"
//   | "trigger"
//   | "call"
//   | "capture"
//   | "ref";
// //

// import * as cheerio from "cheerio";
// import { kebabCase, unescape } from "lodash";

// const $ = cheerio.load("<template/>", { decodeEntities: false }, false);

// interface CreateAureliaNodeOptions {
//   lastInput?: string;
//   lastText?: string;
//   pluralSuffix?: "s" | "List";
// }

// const defaultCreateAureliaNodeOptions: CreateAureliaNodeOptions = {
//   pluralSuffix: "s",
// };

// function createAureliaNode(
//   input: cheerio.Cheerio,
//   options: CreateAureliaNodeOptions = defaultCreateAureliaNodeOptions
// ) {
//   return {
//     addClass: (newClass: string) => {
//       input.addClass(newClass);
//       return createAureliaNode(input, options);
//     },
//     append: (htmlElementType: HTMLElementTypes) => {
//       const newChild = createNode(htmlElementType).returnNode();
//       input.append(newChild);
//       return createAureliaNode(input, options);
//     },
//     attr: (attrName: string, attrValue: string) => {
//       input.attr(attrName, attrValue);
//       return createAureliaNode(input, options);
//     },
//     auAddBindable: (
//       bindable: string,
//       attrBinding: AureliaAttributeBindings = "bind",
//       bindableValue: string
//     ) => {
//       const composedBindable = `${kebabCase(bindable)}.${attrBinding}`;
//       input.attr(composedBindable, bindableValue);
//       return createAureliaNode(input, options);
//     },
//     auAttr: (
//       attrName: string,
//       attrBinding: AureliaAttributeBindings = "bind",
//       attrValue: string
//     ) => {
//       const composedAttr = `${attrName}.${attrBinding}`;
//       input.attr(composedAttr, attrValue);
//       return createAureliaNode(input, options);
//     },
//     auIf: (ifValue: string, attrBinding: AureliaAttributeBindings = "bind") => {
//       const composedAttr = `${AureliaView.IF}.${attrBinding}`;
//       input.attr(composedAttr, ifValue);
//       return createAureliaNode(input, { lastInput: composedAttr });
//     },
//     auRepeatFor: (itaratee: string, iterator?: string) => {
//       let repeatForValue = "";

//       if (!iterator) {
//         let pluralForm = "";

//         if (itaratee.endsWith("y")) {
//           pluralForm = itaratee.replace(/y$/, "ies");
//         } else {
//           pluralForm = `${itaratee}${options.pluralSuffix}`;
//         }

//         repeatForValue = `${itaratee} of ${pluralForm}`;
//       } else {
//         repeatForValue = `${itaratee} of ${iterator}`;
//       }

//       input.attr(`${AureliaView.REPEAT_FOR}`, repeatForValue);
//       return createAureliaNode(input, options);
//     },
//     auValueConverter: (converterName: string, converterValues?: string[]) => {
//       if (options?.lastInput) {
//         const lastAttrValue = input.attr(options.lastInput);

//         if (!lastAttrValue)
//           throw new Error(
//             `Last attribute (${options.lastInput}), had no value`
//           );

//         let withValueConverter = lastAttrValue?.concat(
//           ` ${AureliaView.VALUE_CONVERTER_OPERATOR} ${converterName}`
//         );

//         if (converterValues?.length) {
//           withValueConverter = withValueConverter.concat(
//             converterValues
//               .map(
//                 (converterValue) =>
//                   `${AureliaView.VALUE_CONVERTER_ARGUMENT}${converterValue}`
//               )
//               .join("")
//           );
//         }

//         input.attr(options.lastInput, withValueConverter);

//         return createAureliaNode(input, { lastInput: options.lastInput });
//       }
//       throw new Error("No attribute to attach Value Converter to.");
//     },

//     children: () => {
//       return createAureliaNode(input.children());
//     },
//     comment: (...comments: string[]) => {
//       let commentText = "";
//       if (options?.lastText) {
//         console.log("TCL: options.lastText", options.lastText);
//         commentText =
//           options.lastText + "\n  " + `<!-- ${comments.join(" ")} -->`;
//       } else {
//         commentText = `\n  <!-- ${comments.join(" ")} -->`;
//       }
//       input.text(commentText);
//       return createAureliaNode(input, { lastText: input.text() });
//     },
//     debugLog: () => {
//       return createAureliaNode(input, options);
//     },
//     firstChild: () => {
//       return createAureliaNode(input.children().first());
//       throw new Error("No parent");
//     },
//     newLine: () => {
//       if (options?.lastText) {
//         input.text(options.lastText + "\n  ");
//       } else {
//         input.text("\n");
//       }
//       return createAureliaNode(input, { lastText: input.text() });
//     },
//     lastChild: () => {
//       return createAureliaNode(input.children().last());
//       throw new Error("No parent");
//     },
//     log: () => {
//       console.log(input);
//       return createAureliaNode(input, options);
//     },
//     parent: () => {
//       if (input.parent()) return createAureliaNode(input.parent());
//       throw new Error(`No parent.`);
//     },
//     /**
//      * If you want to end the chain.
//      */
//     returnNode: () => {
//       return input;
//     },

//     /**
//      * Return outerHTML of node
//      */
//     serialize: () => {
//       return unescape(cheerio.html(input));
//     },
//     serializeAsText: () => {
//       return input.text();
//     },
//     text: (textString: string) => {
//       if (options?.lastText) {
//         input.text(options.lastText + "\n  " + textString);
//       } else {
//         input.text(textString);
//       }
//       return createAureliaNode(input, { lastText: input.text() });
//     },
//   };
// }

// function createNode(input: HTMLElementTypes | null, customName?: string) {
//   let newNode;
//   if (input === null) {
//     newNode = $(`<${customName}/>`);
//   } else {
//     newNode = $(`<${input}/>`);
//   }
//   return createAureliaNode(newNode);
// }
