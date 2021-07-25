import {
  CaseAnnotatedExpression,
  CaseAnnotatedExpressionTypeSignature,
  CaseArray,
  CaseArrayTypeSignature,
  CaseBooleanLiteralTypeSignature,
  CaseDictionary,
  CaseDictionaryTypeSignature,
  CaseDirectory,
  CaseDirectoryTypeSignature,
  CaseExpression,
  CaseLiteral,
  CaseNumericLiteralTypeSignature,
  CaseStringLiteralTypeSignature,
  Vector
} from "./types";
import {Dictionary} from "../utils";
import {isCaseAnnotatedExpression, isCaseStruct, isCaseUnparsed} from "./guard";

export type CaseAnnotatedExpressionLike = CaseAnnotatedExpression | CaseExpressionLike;
export type CaseExpressionLike = CaseExpression | CaseLiteralLike;
export type CaseLiteralLike = CaseLiteral | Vector | string | number | boolean;

export function toCaseAnnotatedExpression(x: CaseAnnotatedExpressionLike): CaseAnnotatedExpression {
  if (typeof x === "object" && "type" in x && isCaseAnnotatedExpression(x)) {
    return x
  } else {
    return annotated(toCaseExpression(x))
  }
}

export function toCaseExpression(x: CaseExpressionLike): CaseExpression {
  if (typeof x === "object" && "type" in x && (isCaseStruct(x) || isCaseUnparsed(x))) {
    return x
  } else {
    return toCaseLiteral(x)
  }
}

export function toCaseLiteral(x: CaseLiteralLike): CaseLiteral {
  if (typeof x === "boolean") {
    return {
      type: CaseBooleanLiteralTypeSignature,
      data: x,
    }
  } else if (typeof x === "number") {
    return {
      type: CaseNumericLiteralTypeSignature,
      dimension: undefined,
      data: x,
    }
  } else if (typeof x === "string") {
    return {
      type: CaseStringLiteralTypeSignature,
      data: x,
    }
  } else if (Array.isArray(x)) {
    return {
      type: CaseNumericLiteralTypeSignature,
      dimension: undefined,
      data: x,
    }
  } else {
    return x
  }
}

export function directory(...entries: [string, CaseDictionary][]): CaseDirectory {
  return {
    type: CaseDirectoryTypeSignature,
    fields: Dictionary.fromEntries(entries),
  }
}

export function entry<K extends string, V>(k: K, v: V): [K, V] {
  return [k, v]
}

export function dictionary(...entries: [string, CaseAnnotatedExpressionLike][]): CaseDictionary {
  return {
    type: CaseDictionaryTypeSignature,
    fields: Dictionary.fromEntries(entries.map(([key, anno]) => [key, toCaseAnnotatedExpression(anno)])),
  }
}

export function array(...elements: CaseAnnotatedExpressionLike[]): CaseArray {
  return {
    type: CaseArrayTypeSignature,
    fields: elements.map(toCaseAnnotatedExpression),
  }
}

export function annotated(value: CaseExpressionLike, ...annotations: CaseLiteralLike[]): CaseAnnotatedExpression {
  return {
    type: CaseAnnotatedExpressionTypeSignature,
    value: toCaseExpression(value),
    annotations: annotations.map(toCaseLiteral),
  }
}