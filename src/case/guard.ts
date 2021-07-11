import {
  CaseAnnotatedExpression,
  CaseAnnotatedExpressionTypeSignature,
  CaseArray,
  CaseArrayTypeSignature,
  CaseBooleanLiteral,
  CaseBooleanLiteralTypeSignature,
  CaseDictionary,
  CaseDictionaryTypeSignature, CaseDimensionLiteral, CaseDimensionLiteralTypeSignature,
  CaseDirectory,
  CaseDirectoryTypeSignature,
  CaseExpression,
  CaseLiteral,
  CaseNode,
  CaseNumericLiteral,
  CaseNumericLiteralTypeSignature,
  CaseStringLiteral,
  CaseStringLiteralTypeSignature,
  CaseStruct,
} from "./types";

export function isCaseDirectory(x: CaseNode): x is CaseDirectory {
  return x.type === CaseDirectoryTypeSignature
}

export function isCaseAnnotatedExpression(x: CaseNode): x is CaseAnnotatedExpression {
  return x.type === CaseAnnotatedExpressionTypeSignature
}

export function isCaseExpression(x: CaseNode): x is CaseExpression {
  return isCaseStruct(x) || isCaseLiteral(x)
}

export function isCaseStruct(x: CaseNode): x is CaseStruct {
  return isCaseDictionary(x) || isCaseArray(x)
}

export function isCaseLiteral(x: CaseNode): x is CaseLiteral {
  return isCaseStringLiteral(x) || isCaseBooleanLiteral(x) || isCaseNumericLiteral(x) || isCaseDimensionLiteral(x)
}

export function isCaseDictionary(x: CaseNode): x is CaseDictionary {
  return x.type === CaseDictionaryTypeSignature
}

export function isCaseArray(x: CaseNode): x is CaseArray {
  return x.type === CaseArrayTypeSignature
}

export function isCaseStringLiteral(x: CaseNode): x is CaseStringLiteral {
  return x.type === CaseStringLiteralTypeSignature
}

export function isCaseBooleanLiteral(x: CaseNode): x is CaseBooleanLiteral {
  return x.type === CaseBooleanLiteralTypeSignature
}

export function isCaseNumericLiteral(x: CaseNode): x is CaseNumericLiteral {
  return x.type === CaseNumericLiteralTypeSignature
}

export function isCaseDimensionLiteral(x: CaseNode): x is CaseDimensionLiteral {
  return x.type === CaseDimensionLiteralTypeSignature
}