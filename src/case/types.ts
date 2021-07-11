import {Dictionary} from "../utils";
import {Dimension} from "./parser";

export type CaseNode =
  | CaseDirectory
  | CaseAnnotatedExpression
  | CaseExpression;

export const CaseDirectoryTypeSignature = "case.directory" as const;
export interface CaseDirectory {
  type: typeof CaseDirectoryTypeSignature;
  fields: Dictionary<string, CaseDictionary>;
}

export const CaseAnnotatedExpressionTypeSignature = "case.annotatedExpression" as const;
export interface CaseAnnotatedExpression {
  type: typeof CaseAnnotatedExpressionTypeSignature;
  value: CaseExpression;
  annotations: CaseLiteral[];
}

export type CaseExpression =
  | CaseStruct
  | CaseLiteral;

export type CaseStruct =
  | CaseDictionary
  | CaseArray;

export type CaseLiteral =
  | CaseStringLiteral
  | CaseBooleanLiteral
  | CaseNumericLiteral
  | CaseDimensionLiteral;

export const CaseDictionaryTypeSignature = "case.dictionary" as const;
export interface CaseDictionary {
  type: typeof CaseDictionaryTypeSignature;
  fields: Dictionary<string, CaseAnnotatedExpression>;
}

export const CaseArrayTypeSignature = "case.array" as const;
export interface CaseArray {
  type: typeof CaseArrayTypeSignature;
  fields: CaseAnnotatedExpression[];
}

export const CaseStringLiteralTypeSignature = "case.stringLiteral" as const;
export interface CaseStringLiteral {
  type: typeof CaseStringLiteralTypeSignature;
  data: string;
}

export const CaseBooleanLiteralTypeSignature = "case.booleanLiteral" as const;
export interface CaseBooleanLiteral {
  type: typeof CaseBooleanLiteralTypeSignature;
  data: boolean;
}

export const CaseNumericLiteralTypeSignature = "case.numericLiteral" as const;
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
