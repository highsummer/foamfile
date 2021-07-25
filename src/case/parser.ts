import {alt, createLanguage, Parser, regexp, seq, string, TypedLanguage, whitespace} from "parsimmon";
import {
  CaseAnnotatedExpression,
  CaseAnnotatedExpressionTypeSignature,
  CaseArray,
  CaseArrayTypeSignature,
  CaseBooleanLiteral,
  CaseBooleanLiteralTypeSignature,
  CaseDictionary,
  CaseDictionaryTypeSignature, CaseDimensionLiteral, CaseDimensionLiteralTypeSignature,
  CaseExpression,
  CaseLiteral,
  CaseNumericLiteral,
  CaseNumericLiteralTypeSignature,
  CaseStringLiteral,
  CaseStringLiteralTypeSignature,
  CaseStruct, CaseUnparsed, CaseUnparsedTypeSignature,
  Vector
} from "./types";
import {Dictionary, Exception, fail} from "../utils";
import {Either, left, right} from "fp-chainer/lib/either";
import {toCaseLiteral} from "./constructor";

export type Dimension = [number, number, number, number, number, number, number];

// Possible classes
// 'IOobject', 'cellList', 'dictionary', 'faceList',
// 'featureEdgeMesh', 'labelList', 'pointScalarField',
// 'pointVectorField', 'polyBoundaryMesh', 'uniformDimensionedScalarField',
// 'uniformDimensionedVectorField', 'vectorField', 'volScalarField',
// 'volSymmTensorField', 'volVectorField'

const commentSingle = regexp(/\/\/[^\n]*/)
  .desc("commentSingle");
const commentMulti = seq(string("/*"), regexp(/(?!\*\/)((\*[^*]*)|([^*]+))/).many(), string("*/"))
  .desc("commentMulti");

export const UnnamedDefaultKeySymbol = "!unnamed_default";

function token<T>(parser: Parser<T>) {
  return alt(whitespace, commentSingle, commentMulti).many().then(parser);
}

function word(str: string) {
  return string(str).thru(token);
}

function alt2<A, B>(a: Parser<A>, b: Parser<B>): Parser<A | B> {
  return alt(a, b) as Parser<A | B>
}

function alt3<A, B, C>(a: Parser<A>, b: Parser<B>, c: Parser<C>): Parser<A | B | C> {
  return alt(a, b, c) as Parser<A | B | C>
}

function alt4<A, B, C, D>(a: Parser<A>, b: Parser<B>, c: Parser<C>, d: Parser<D>): Parser<A | B | C | D> {
  return alt(a, b, c, d) as Parser<A | B | C | D>
}

function option<T>(p: Parser<T>): Parser<T | undefined> {
  return p.atMost(1).map(xs => xs.length === 1 ? xs[0] : undefined)
}

function ruleNumber(lang: LanguageFoam): Parser<number> {
  return token(regexp(/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/))
    .map(Number)
    .desc("number")
}

function ruleBoolean(lang: LanguageFoam): Parser<boolean> {
  return alt2(
    word("true").map(() => true),
    word("false").map(() => false),
  ).desc("boolean")
}

function ruleString(lang: LanguageFoam): Parser<string> {
  return alt2(
    token(regexp(/"((?:\\.|.)*?)"/, 1))
      .desc("quotedString"),
    token(regexp(/\$?[()<>a-zA-Z_-][^";})\]\s]*/))
      .desc("plainString")
  ).desc("string")
}

function ruleDimension(lang: LanguageFoam): Parser<Dimension> {
  return word("[")
    .then(ruleNumber(lang).many())
    .map(values => (values as Dimension))
    .skip(word("]"))
    .desc("dimension")
}

function ruleVector(lang: LanguageFoam): Parser<Vector> {
  return word("(")
    .then(seq(lang.ruleNumber, lang.ruleNumber, lang.ruleNumber))
    .skip(word(")"))
    .desc("vector")
}

function ruleBooleanLiteral(lang: LanguageFoam): Parser<CaseBooleanLiteral> {
  return lang.ruleBoolean
    .map(x => ({ type: CaseBooleanLiteralTypeSignature, data: x }))
    .desc("booleanLiteral")
}

function ruleStringLiteral(lang: LanguageFoam): Parser<CaseStringLiteral> {
  return lang.ruleString
    .map(x => ({ type: CaseStringLiteralTypeSignature, data: x }))
    .desc("stringLiteral")
}

function ruleNumericLiteral(lang: LanguageFoam): Parser<CaseNumericLiteral> {
  return seq(
    option(lang.ruleDimension),
    alt2(lang.ruleVector, lang.ruleNumber),
  )
    .map(([dim, val]) => ({ type: CaseNumericLiteralTypeSignature, dimension: dim, data: val }))
    .desc("numericLiteral")
}

function ruleDimensionLiteral(lang: LanguageFoam): Parser<CaseDimensionLiteral> {
  return lang.ruleDimension
    .map(dim => ({ type: CaseDimensionLiteralTypeSignature, data: dim }))
    .desc("dimensionLiteral")
}

function ruleLiteral(lang: LanguageFoam): Parser<CaseLiteral> {
  return alt4(
    lang.ruleBooleanLiteral,
    lang.ruleStringLiteral,
    lang.ruleNumericLiteral,
    lang.ruleDimensionLiteral,
  )
    .desc("literal")
}

function ruleStruct(lang: LanguageFoam): Parser<CaseStruct> {
  return alt2(
    lang.ruleArray,
    lang.ruleDictionary,
  )
    .desc("struct")
}

function ruleExpression(lang: LanguageFoam): Parser<CaseExpression> {
  return alt3(
    lang.ruleLiteral,
    lang.ruleArray,
    lang.ruleDictionary,
  )
    .desc("expression")
}

function ruleUnparsedNonuniform(lang: LanguageFoam): Parser<CaseAnnotatedExpression> {
  return alt2(
    seq(
      word("nonuniform"),
      word("List<scalar>"),
      lang.ruleNumber.map(x => x.toString()),
      word("("),
      regexp(/[0-9.\se,+-]*/),
      word(")"),
      option(word(";")).map(o => o ?? ""),
    )
      .map(tokens => ({
        type: CaseAnnotatedExpressionTypeSignature,
        annotations: [toCaseLiteral(tokens[0]), toCaseLiteral(tokens[1])],
        value: ({
          type: CaseUnparsedTypeSignature,
          data: tokens.slice(2).join(" "),
        })
      })),
    seq(
      word("nonuniform"),
      word("List<vector>"),
      lang.ruleNumber.map(x => x.toString()),
      word("("),
      regexp(/(\s*\([0-9.\se,+-]+\s+[0-9.\se,+-]+\s+[0-9.\se,+-]+\)\s*)+/),
      word(")"),
      option(word(";")).map(o => o ?? ""),
    )
      .map(tokens => ({
        type: CaseAnnotatedExpressionTypeSignature,
        annotations: [toCaseLiteral(tokens[0]), toCaseLiteral(tokens[1])],
        value: ({
          type: CaseUnparsedTypeSignature,
          data: tokens.slice(2).join(" "),
        })
      }))
  )
    .desc("unparsedNonuniform")
}

function ruleAnnotatedExpression(lang: LanguageFoam): Parser<CaseAnnotatedExpression> {
  return alt4(
    lang.ruleUnparsedNonuniform
      .map(anno => [anno.annotations, anno.value] as const),
    lang.ruleLiteral.many().skip(word(";"))
      .map(literals => [literals.slice(0, literals.length - 1), literals[literals.length - 1]] as [CaseLiteral[], CaseLiteral]),
    seq(
      lang.ruleLiteral.many(),
      lang.ruleDictionary,
    ),
    seq(
      lang.ruleLiteral.many(),
      lang.ruleArray,
      option(word(";")),
    )
      .map(([annotations, value, _]) => [annotations, value] as const),
  )
    .map(([annotations, value]) => ({
      type: CaseAnnotatedExpressionTypeSignature,
      annotations: annotations,
      value: value
    }))
    .desc("annotatedExpression")
}

function ruleArray(lang: LanguageFoam): Parser<CaseArray> {
  return option(lang.ruleNumber)
    .then(word("("))
    .then(lang.ruleExpression.many())
    .skip(word(")"))
    .map(fields => ({
      type: CaseArrayTypeSignature,
      fields: fields.map(x => ({ type: CaseAnnotatedExpressionTypeSignature, annotations: [], value: x })),
    }))
    .desc("array")
}

function ruleDeclaration(lang: LanguageFoam): Parser<[string, CaseAnnotatedExpression]> {
  return seq(lang.ruleString, lang.ruleAnnotatedExpression)
}

function ruleDictionary(lang: LanguageFoam): Parser<CaseDictionary> {
  return word("{")
    .then(lang.ruleDeclaration.many())
    .skip(word("}"))
    .map(pairs => ({
      type: CaseDictionaryTypeSignature,
      fields: Dictionary.fromEntries(pairs),
    }))
    .desc("dictionary")
}

function ruleFoamDictionary(lang: LanguageFoam): Parser<CaseDictionary> {
  return lang.ruleDeclaration.many()
    .map(pairs => ({
      type: CaseDictionaryTypeSignature,
      fields: Dictionary.fromEntries(pairs),
    }))
    .desc("foamDictionary")
}

function ruleFoamArray(lang: LanguageFoam): Parser<CaseDictionary> {
  return seq(
    lang.ruleDeclaration,
    lang.ruleNumber,
    word("("),
    lang.ruleDeclaration.many(),
    word(")"),
  )
    .map(([header, length, open, pairs, close]) => ({
      type: CaseDictionaryTypeSignature,
      fields: Dictionary.fromEntries([header, ...pairs]),
    }))
    .desc("foamArray")
}

function ruleFoam(lang: LanguageFoam): Parser<CaseDictionary> {
  return alt2(lang.ruleFoamArray, lang.ruleFoamDictionary)
    .skip(token(word("")))
    .desc("foam")
}

const rules = {
  ruleNumber: ruleNumber,
  ruleBoolean: ruleBoolean,
  ruleString: ruleString,
  ruleDimension: ruleDimension,
  ruleVector: ruleVector,
  ruleBooleanLiteral: ruleBooleanLiteral,
  ruleStringLiteral: ruleStringLiteral,
  ruleNumericLiteral: ruleNumericLiteral,
  ruleDimensionLiteral: ruleDimensionLiteral,
  ruleLiteral: ruleLiteral,
  ruleStruct: ruleStruct,
  ruleExpression: ruleExpression,
  ruleUnparsedNonuniform: ruleUnparsedNonuniform,
  ruleAnnotatedExpression: ruleAnnotatedExpression,
  ruleArray: ruleArray,
  ruleDeclaration: ruleDeclaration,
  ruleDictionary: ruleDictionary,
  ruleFoamDictionary: ruleFoamDictionary,
  ruleFoamArray: ruleFoamArray,
  ruleFoam: ruleFoam,
};

type TypeOf<T> = T extends (...args: any[]) => Parser<infer R> ? R : never;
type Spec = { [K in keyof typeof rules]: TypeOf<(typeof rules)[K]> };
type LanguageFoam = TypedLanguage<Spec>;

const foamLang = createLanguage(rules);

export const ParserExceptionCannotParse = "core.case.parser.CannotParse" as const;

export function parse(input: string): Either<Exception<typeof ParserExceptionCannotParse>, CaseDictionary> {
  try {
    return right(foamLang.ruleFoam.tryParse(input))
  } catch (e) {
    return left(fail(ParserExceptionCannotParse, e))
  }
}