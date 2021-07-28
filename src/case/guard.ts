import {
  CaseAnnotatedExpression,
  CaseAnnotatedExpressionTypeSignature,
  CaseArray,
  CaseArrayTypeSignature,
  CaseBooleanLiteral,
  CaseBooleanLiteralTypeSignature,
  CaseDeclaration,
  CaseDeclarationTypeSignature,
  CaseDictionary,
  CaseDictionaryTypeSignature,
  CaseDimensionLiteral,
  CaseDimensionLiteralTypeSignature,
  CaseDirectory,
  CaseDirectoryTypeSignature,
  CaseExpression,
  CaseLiteral,
  CaseMacro,
  CaseMacroIdentifier,
  CaseMacroIdentifierTypeSignature,
  CaseMacroParentSearch,
  CaseMacroParentSearchTypeSignature, CaseMacroPreprocessor, CaseMacroPreprocessorTypeSignature,
  CaseMacroQualifiedName,
  CaseMacroQualifiedNameTypeSignature,
  CaseMacroRootSearch,
  CaseMacroRootSearchTypeSignature,
  CaseNode,
  CaseNumericLiteral,
  CaseNumericLiteralTypeSignature, CaseRegexDeclaration, CaseRegexDeclarationTypeSignature,
  CaseStringLiteral,
  CaseStringLiteralTypeSignature,
  CaseStruct,
  CaseUnparsed,
  CaseUnparsedTypeSignature,
} from "./types";

export function isCaseDirectory(x: CaseNode): x is CaseDirectory {
  return x.type === CaseDirectoryTypeSignature
}

export function isCaseAnnotatedExpression(x: CaseNode): x is CaseAnnotatedExpression {
  return x.type === CaseAnnotatedExpressionTypeSignature
}

export function isCaseExpression(x: CaseNode): x is CaseExpression {
  return isCaseStruct(x) || isCaseLiteral(x) || isCaseUnparsed(x)
}

export function isCaseStruct(x: CaseNode): x is CaseStruct {
  return isCaseDictionary(x) || isCaseArray(x)
}

export function isCaseLiteral(x: CaseNode): x is CaseLiteral {
  return isCaseStringLiteral(x) || isCaseBooleanLiteral(x) || isCaseNumericLiteral(x) || isCaseDimensionLiteral(x)
}

export function isCaseUnparsed(x: CaseNode): x is CaseUnparsed {
  return x.type === CaseUnparsedTypeSignature
}

export function isCaseDictionary(x: CaseNode): x is CaseDictionary {
  return x.type === CaseDictionaryTypeSignature
}

export function isCaseDeclaration(x: CaseNode): x is CaseDeclaration {
  return x.type === CaseDeclarationTypeSignature
}

export function isCaseRegexDeclaration(x: CaseNode): x is CaseRegexDeclaration {
  return x.type === CaseRegexDeclarationTypeSignature
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

export function isCaseMacro(x: CaseNode): x is CaseMacro {
  return isCaseMacroIdentifier(x) || isCaseMacroParentSearch(x) || isCaseMacroRootSearch(x) || isCaseMacroQualifiedName(x) || isCaseMacroPreprocessor(x)
}

export function isCaseMacroIdentifier(x: CaseNode): x is CaseMacroIdentifier {
  return x.type === CaseMacroIdentifierTypeSignature
}

export function isCaseMacroParentSearch(x: CaseNode): x is CaseMacroParentSearch {
  return x.type === CaseMacroParentSearchTypeSignature
}

export function isCaseMacroRootSearch(x: CaseNode): x is CaseMacroRootSearch {
  return x.type === CaseMacroRootSearchTypeSignature
}

export function isCaseMacroQualifiedName(x: CaseNode): x is CaseMacroQualifiedName {
  return x.type === CaseMacroQualifiedNameTypeSignature
}

export function isCaseMacroPreprocessor(x: CaseNode): x is CaseMacroPreprocessor {
  return x.type === CaseMacroPreprocessorTypeSignature
}