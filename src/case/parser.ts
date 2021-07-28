import {alt, createLanguage, Parser, regexp, seq, string, TypedLanguage, whitespace} from "parsimmon";
import {
  CaseAnnotatedExpression,
  CaseAnnotatedExpressionTypeSignature,
  CaseArray,
  CaseArrayTypeSignature,
  CaseBooleanLiteral,
  CaseBooleanLiteralTypeSignature, CaseDeclaration, CaseDeclarationTypeSignature,
  CaseDictionary,
  CaseDictionaryTypeSignature,
  CaseDimensionLiteral,
  CaseDimensionLiteralTypeSignature,
  CaseExpression,
  CaseLiteral,
  CaseMacro,
  CaseMacroIdentifier,
  CaseMacroIdentifierTypeSignature, CaseMacroParentSearch, CaseMacroParentSearchTypeSignature, CaseMacroQualifiedName,
  CaseMacroQualifiedNameTypeSignature,
  CaseMacroRootSearch, CaseMacroRootSearchTypeSignature,
  CaseNumericLiteral,
  CaseNumericLiteralTypeSignature, CaseRegexDeclaration, CaseRegexDeclarationTypeSignature,
  CaseStringLiteral,
  CaseStringLiteralTypeSignature,
  CaseStruct,
  CaseUnparsed,
  CaseUnparsedTypeSignature,
  Vector
} from "./types";
import {Dictionary, Exception, fail} from "../utils";
import {Either, left, right} from "fp-chainer/lib/either";
import {toCaseLiteral} from "./constructor";

namespace Macro {
  function ruleMacroInner(lang: LanguageMacro): Parser<CaseMacro> {
    return alt3(
      lang.ruleParentSearch,
      lang.ruleQualifiedName,
      lang.ruleIdentifier,
    )
      .desc("macro")
  }

  function ruleRootSearch(lang: LanguageMacro): Parser<CaseMacroRootSearch> {
    return seq(
      string(":"),
      lang.ruleMacroInner,
    )
      .map(([_, node]) => ({
        type: CaseMacroRootSearchTypeSignature,
        node: node,
      }))
      .desc("rootSearch")
  }

  function ruleParentSearch(lang: LanguageMacro): Parser<CaseMacroParentSearch> {
    return seq(
      regexp(/\.\.+/),
      lang.ruleMacroInner,
    )
      .map(([periods, node]) => new Array(periods.length - 2)
        .fill(0)
        .reduce<CaseMacroParentSearch>((acc, _) => ({
          type: CaseMacroParentSearchTypeSignature,
          node: acc,
        }), ({
          type: CaseMacroParentSearchTypeSignature,
          node: node,
        }))
      )
      .desc("parentSearch")
  }

  function ruleQualifiedName(lang: LanguageMacro): Parser<CaseMacroQualifiedName> {
    return seq(
      lang.ruleIdentifier,
      string("."),
      lang.ruleMacroInner,
    )
      .map(([namespace, _, node]) => ({
        type: CaseMacroQualifiedNameTypeSignature,
        namespace: namespace.name,
        node: node,
      }))
      .desc("qualifiedName")
  }

  function ruleIdentifier(lang: LanguageMacro): Parser<CaseMacroIdentifier> {
    return regexp(/[a-zA-Z0-9_.:]+/)
      .map(name => ({
        type: CaseMacroIdentifierTypeSignature,
        name: name,
      }))
      .desc("identifier")
  }

  function ruleMacroOuter(lang: LanguageMacro): Parser<CaseMacro> {
    return seq(
      string("$"),
      alt4(
        lang.ruleRootSearch,
        lang.ruleParentSearch,
        lang.ruleQualifiedName,
        lang.ruleIdentifier,
      ),
    )
      .map(([_, macro]) => macro)
      .desc("macro")
  }

  export const rules = {
    ruleMacroInner,
    ruleMacro: ruleMacroOuter,
    ruleRootSearch,
    ruleParentSearch,
    ruleQualifiedName,
    ruleIdentifier,
  };

  type LanguageMacro = TypedLanguage<Spec<typeof rules>>;
}

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
  return token(regexp(/[^\s{};]+/))
    .desc("string")
}

function ruleDoubleQuote(lang: LanguageFoam): Parser<string> {
  return token(regexp(/"([^\\"]|\\\\|\\")*"/).map(_ => _.slice(1, -1)))
    .desc("doubleQuote")
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
  return alt(
    lang.ruleDoubleQuote,
    lang.ruleString,
  )
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
    lang.ruleNumericLiteral,
    lang.ruleDimensionLiteral,
    lang.ruleStringLiteral,
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
      token(regexp(/[0-9.\se,+-]*/)),
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
      token(regexp(/(\s*\([0-9.\se,+-]+\s+[0-9.\se,+-]+\s+[0-9.\se,+-]+\)\s*)+/)),
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
      .map(anno => [anno.annotations, anno.value] as const)
      .desc("annotatedUnparsed"),
    alt2(
      lang.ruleLiteral,
      lang.ruleMacro,
    )
      .many()
      .skip(word(";"))
      .map(literals => [literals.slice(0, literals.length - 1), literals[literals.length - 1]] as [CaseLiteral[], CaseLiteral])
      .desc("annotatedLiteral"),
    seq(
      alt2(
        lang.ruleLiteral,
        lang.ruleMacro,
      )
        .many(),
      lang.ruleDictionary,
    )
      .desc("annotatedDictionary"),
    seq(
      alt2(
        lang.ruleLiteral,
        lang.ruleMacro,
      ).many(),
      lang.ruleArray,
      option(word(";")),
    )
      .map(([annotations, value, _]) => [annotations, value] as const)
      .desc("annotatedArray"),
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
    .then(alt2(
      lang.ruleExpression,
      lang.ruleMacro,
    ).many())
    .skip(word(")"))
    .map(fields => ({
      type: CaseArrayTypeSignature,
      fields: fields.map(x => ({ type: CaseAnnotatedExpressionTypeSignature, annotations: [], value: x })),
    }))
    .desc("array")
}

function ruleDeclaration(lang: LanguageFoam): Parser<CaseDeclaration> {
  return seq(lang.ruleString, alt2(lang.ruleAnnotatedExpression, lang.ruleMacro))
    .map(([key, value]) => ({
      type: CaseDeclarationTypeSignature,
      key: key,
      value: value,
    }))
    .desc("declaration")
}

function ruleRegexDeclaration(lang: LanguageFoam): Parser<CaseRegexDeclaration> {
  return seq(lang.ruleDoubleQuote, alt2(lang.ruleAnnotatedExpression, lang.ruleMacro))
    .map(([key, value]) => ({
      type: CaseRegexDeclarationTypeSignature,
      pattern: key,
      value: value,
    }))
    .desc("regexDeclaration")
}

function ruleDictionary(lang: LanguageFoam): Parser<CaseDictionary> {
  return word("{")
    .then(alt3(
      lang.ruleDeclaration,
      lang.ruleRegexDeclaration,
      lang.ruleMacro,
    ).many())
    .skip(word("}"))
    .map(entries => ({
      type: CaseDictionaryTypeSignature,
      fields: entries,
    }))
    .desc("dictionary")
}

function ruleFoamDictionary(lang: LanguageFoam): Parser<CaseDictionary> {
  return lang.ruleDeclaration.many()
    .map(entries => ({
      type: CaseDictionaryTypeSignature,
      fields: entries,
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
      fields: [header, ...pairs],
    }))
    .desc("foamArray")
}

function ruleFoam(lang: LanguageFoam): Parser<CaseDictionary> {
  return alt2(lang.ruleFoamArray, lang.ruleFoamDictionary)
    .skip(token(word("")))
    .desc("foam")
}

const rules = {
  ruleNumber,
  ruleBoolean,
  ruleString,
  ruleDoubleQuote,
  ruleDimension,
  ruleVector,
  ruleBooleanLiteral,
  ruleStringLiteral,
  ruleNumericLiteral,
  ruleDimensionLiteral,
  ruleLiteral,
  ruleStruct,
  ruleExpression,
  ruleUnparsedNonuniform,
  ruleAnnotatedExpression,
  ruleArray,
  ruleDeclaration,
  ruleRegexDeclaration,
  ruleDictionary,
  ruleFoamDictionary,
  ruleFoamArray,
  ruleFoam,

  ...Macro.rules,
};

type TypeOf<T> = T extends (...args: any[]) => Parser<infer R> ? R : never;
type Spec<T> = { [K in keyof T]: TypeOf<(T)[K]> };
type LanguageFoam = TypedLanguage<Spec<typeof rules>>;

const foamLang = createLanguage(rules);

export const ParserExceptionCannotParse = "core.case.parser.CannotParse" as const;

export function parse(input: string): Either<Exception<typeof ParserExceptionCannotParse>, CaseDictionary> {
  try {
    return right(foamLang.ruleFoam.tryParse(input))
  } catch (e) {
    return left(fail(ParserExceptionCannotParse, e))
  }
}