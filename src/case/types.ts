import {Dictionary} from "../utils";
import {Dimension} from "./parser";

export type CaseNode =
  | CaseDirectory
  | CaseAnnotatedExpression
  | CaseExpression
  | CaseDeclaration
  | CaseRegexDeclaration
  | CaseMacro;

export const CaseDirectoryTypeSignature = "case.directory" as const;
export interface CaseDirectory {
  type: typeof CaseDirectoryTypeSignature;
  fields: Dictionary<string, CaseDictionary>;
}

export const CaseAnnotatedExpressionTypeSignature = "case.annotatedExpression" as const;
export interface CaseAnnotatedExpression {
  type: typeof CaseAnnotatedExpressionTypeSignature;
  value: CaseExpression | CaseMacro;
  annotations: (CaseLiteral | CaseMacro)[];
}

export type CaseExpression =
  | CaseStruct
  | CaseLiteral
  | CaseUnparsed;

export type CaseStruct =
  | CaseDictionary
  | CaseArray;

export type CaseLiteral =
  | CaseStringLiteral
  | CaseBooleanLiteral
  | CaseNumericLiteral
  | CaseDimensionLiteral;

export const CaseUnparsedTypeSignature = "case.unparsed" as const;
export interface CaseUnparsed {
  type: typeof CaseUnparsedTypeSignature;
  data: string;
}

export const CaseDictionaryTypeSignature = "case.dictionary" as const;
export interface CaseDictionary {
  type: typeof CaseDictionaryTypeSignature;
  fields: (CaseDeclaration | CaseRegexDeclaration | CaseMacro)[];
}

export const CaseDeclarationTypeSignature = "case.declaration" as const;
export interface CaseDeclaration {
  type: typeof CaseDeclarationTypeSignature;
  key: string;
  value: CaseAnnotatedExpression | CaseMacro;
}

export const CaseRegexDeclarationTypeSignature = "case.regexDeclaration" as const;
export interface CaseRegexDeclaration {
  type: typeof CaseRegexDeclarationTypeSignature;
  pattern: string;
  value: CaseAnnotatedExpression | CaseMacro;
}

export const CaseArrayTypeSignature = "case.array" as const;
export interface CaseArray {
  type: typeof CaseArrayTypeSignature;
  fields: (CaseAnnotatedExpression | CaseMacro)[];
}

export const CaseStringLiteralTypeSignature = "case.literal.string" as const;
export interface CaseStringLiteral {
  type: typeof CaseStringLiteralTypeSignature;
  data: string;
}

export const CaseBooleanLiteralTypeSignature = "case.literal.boolean" as const;
export interface CaseBooleanLiteral {
  type: typeof CaseBooleanLiteralTypeSignature;
  data: boolean;
}

export const CaseNumericLiteralTypeSignature = "case.literal.numeric" as const;
export interface CaseNumericLiteral {
  type: typeof CaseNumericLiteralTypeSignature;
  data: number | Vector;
  dimension?: Dimension;
}

export const CaseDimensionLiteralTypeSignature = "case.dimensionLiteral" as const;
export interface CaseDimensionLiteral {
  type: typeof CaseDimensionLiteralTypeSignature;
  data: Dimension;
}

export type Vector = [number, number, number];

export type CaseMacro = CaseMacroIdentifier | CaseMacroQualifiedName | CaseMacroParentSearch | CaseMacroRootSearch;

export const CaseMacroIdentifierTypeSignature = "case.macro.identifier" as const;
export interface CaseMacroIdentifier {
  type: typeof CaseMacroIdentifierTypeSignature;
  name: string;
}

export const CaseMacroQualifiedNameTypeSignature = "case.macro.qualifiedName" as const;
export interface CaseMacroQualifiedName {
  type: typeof CaseMacroQualifiedNameTypeSignature;
  namespace: string;
  node: CaseMacro;
}

export const CaseMacroParentSearchTypeSignature = "case.macro.parentSearch" as const;
export interface CaseMacroParentSearch {
  type: typeof CaseMacroParentSearchTypeSignature;
  node: CaseMacro;
}

export const CaseMacroRootSearchTypeSignature = "case.macro.rootSearch" as const;
export interface CaseMacroRootSearch {
  type: typeof CaseMacroRootSearchTypeSignature;
  node: CaseMacro;
}