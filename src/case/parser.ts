import {alt, createLanguage, Parser, regexp, seq, string, TypedLanguage, whitespace} from "parsimmon";
import {Dictionary, Exception, fail} from "../utils";
import {Either, left, right} from "fp-chainer/lib/either";
import {
  CaseMacro,
  CaseMacroIdentifier,
  CaseMacroParentSearch, CaseMacroPreprocessor,
  CaseMacroQualifiedName,
  CaseMacroRootSearch
} from "./caseMacro";
import {
  CaseBooleanLiteral,
  CaseDimensionLiteral,
  CaseLiteral,
  CaseNumericLiteral,
  CaseStringLiteral
} from "./caseLiteral";
import {Vector} from "./helpers";
import {CaseStruct} from "./caseStruct";
import {CaseExpression} from "./caseExpression";
import {CaseAnnotatedExpression} from "./caseAnnotatedExpression";
import {CaseUnparsed} from "./caseUnparsed";
import {CaseArray} from "./caseArray";
import {CaseDeclaration} from "./caseDeclaration";
import {CaseRegexDeclaration} from "./caseRegexDeclaration";
import {CaseDictionary} from "./caseDictionary";

namespace Macro {
  function ruleMacroInner(lang: LanguageMacro): Parser<CaseMacro.Type> {
    return alt3(
      lang.ruleParentSearch,
      lang.ruleQualifiedName,
      lang.ruleIdentifier,
    )
      .desc("macro")
  }

  function ruleRootSearch(lang: LanguageMacro): Parser<CaseMacroRootSearch.Type> {
    return seq(
      string(":"),
      lang.ruleMacroInner,
    )
      .map(([_, node]) => ({
        type: CaseMacroRootSearch.TypeSignature,
        node: node,
      }))
      .desc("rootSearch")
  }

  function ruleParentSearch(lang: LanguageMacro): Parser<CaseMacroParentSearch.Type> {
    return seq(
      regexp(/\.\.+/),
      lang.ruleMacroInner,
    )
      .map(([periods, node]) => new Array(periods.length - 2)
        .fill(0)
        .reduce<CaseMacroParentSearch.Type>((acc, _) => ({
          type: CaseMacroParentSearch.TypeSignature,
          node: acc,
        }), ({
          type: CaseMacroParentSearch.TypeSignature,
          node: node,
        }))
      )
      .desc("parentSearch")
  }

  function ruleQualifiedName(lang: LanguageMacro): Parser<CaseMacroQualifiedName.Type> {
    return seq(
      lang.ruleIdentifier,
      string("."),
      lang.ruleMacroInner,
    )
      .map(([namespace, _, node]) => ({
        type: CaseMacroQualifiedName.TypeSignature,
        namespace: namespace.name,
        node: node,
      }))
      .desc("qualifiedName")
  }

  function ruleIdentifier(lang: LanguageMacro): Parser<CaseMacroIdentifier.Type> {
    return regexp(/[a-zA-Z0-9_.:]+/)
      .map(name => ({
        type: CaseMacroIdentifier.TypeSignature,
        name: name,
      }))
      .desc("identifier")
  }

  function rulePreprocessor(lang: LanguageFoam): Parser<CaseMacroPreprocessor.Type> {
    return seq(
      token(regexp(/(#include(IfPresent|Etc|Func)?)|(#remove)/)),
      alt(lang.ruleDoubleQuote, lang.ruleString).many()
    )
      .map(([directive, args]) => ({
        type: CaseMacroPreprocessor.TypeSignature,
        directive: directive.slice(1),
        arguments: args,
      }))
      .desc("preprocessor")
  }

  function ruleMacroOuter(lang: LanguageMacro): Parser<CaseMacro.Type> {
    return alt2(
      seq(
        string("$"),
        alt4(
          lang.ruleRootSearch,
          lang.ruleParentSearch,
          lang.ruleQualifiedName,
          lang.ruleIdentifier,
        ),
      )
        .map(([_, macro]) => macro),
      lang.rulePreprocessor
    )
      .desc("macro")
  }

  export const rules = {
    ruleMacroInner,
    ruleMacro: ruleMacroOuter,
    ruleRootSearch,
    ruleParentSearch,
    ruleQualifiedName,
    ruleIdentifier,
    rulePreprocessor,
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
  return alt(
    word("true").map(() => true),
    word("on").map(() => true),
    word("false").map(() => false),
    word("off").map(() => false),
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

function ruleBooleanLiteral(lang: LanguageFoam): Parser<CaseBooleanLiteral.Type> {
  return lang.ruleBoolean
    .map(x => {
      return ({type: CaseBooleanLiteral.TypeSignature, data: x});
    })
    .desc("booleanLiteral")
}

function ruleStringLiteral(lang: LanguageFoam): Parser<CaseStringLiteral.Type> {
  return alt(
    lang.ruleDoubleQuote,
    lang.ruleString,
  )
    .map(x => ({ type: CaseStringLiteral.TypeSignature, data: x }))
    .desc("stringLiteral")
}

function ruleNumericLiteral(lang: LanguageFoam): Parser<CaseNumericLiteral.Type> {
  return seq(
    option(lang.ruleDimension),
    alt2(lang.ruleVector, lang.ruleNumber),
  )
    .map(([dim, val]) => ({ type: CaseNumericLiteral.TypeSignature, dimension: dim, data: val }))
    .desc("numericLiteral")
}

function ruleDimensionLiteral(lang: LanguageFoam): Parser<CaseDimensionLiteral.Type> {
  return lang.ruleDimension
    .map(dim => ({ type: CaseDimensionLiteral.TypeSignature, data: dim }))
    .desc("dimensionLiteral")
}

function ruleLiteral(lang: LanguageFoam): Parser<CaseLiteral.Type> {
  return alt4(
    lang.ruleBooleanLiteral,
    lang.ruleNumericLiteral,
    lang.ruleDimensionLiteral,
    lang.ruleStringLiteral,
  )
    .desc("literal")
}

function ruleStruct(lang: LanguageFoam): Parser<CaseStruct.Type> {
  return alt2(
    lang.ruleArray,
    lang.ruleDictionary,
  )
    .desc("struct")
}

function ruleExpression(lang: LanguageFoam): Parser<CaseExpression.Type> {
  return alt3(
    lang.ruleLiteral,
    lang.ruleArray,
    lang.ruleDictionary,
  )
    .desc("expression")
}

function ruleUnparsedNonuniform(lang: LanguageFoam): Parser<CaseAnnotatedExpression.Type> {
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
        type: CaseAnnotatedExpression.TypeSignature,
        annotations: [CaseLiteral.to(tokens[0]), CaseLiteral.to(tokens[1])],
        value: ({
          type: CaseUnparsed.TypeSignature,
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
        type: CaseAnnotatedExpression.TypeSignature,
        annotations: [CaseLiteral.to(tokens[0]), CaseLiteral.to(tokens[1])],
        value: ({
          type: CaseUnparsed.TypeSignature,
          data: tokens.slice(2).join(" "),
        })
      }))
  )
    .desc("unparsedNonuniform")
}

function ruleAnnotatedExpression(lang: LanguageFoam): Parser<CaseAnnotatedExpression.Type> {
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
      .map(literals => [literals.slice(0, literals.length - 1), literals[literals.length - 1]] as [CaseLiteral.Type[], CaseLiteral.Type])
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
      type: CaseAnnotatedExpression.TypeSignature,
      annotations: annotations,
      value: value
    }))
    .desc("annotatedExpression")
}

function ruleArray(lang: LanguageFoam): Parser<CaseArray.Type> {
  return option(lang.ruleNumber)
    .then(word("("))
    .then(alt2(
      lang.ruleExpression,
      lang.ruleMacro,
    ).many())
    .skip(word(")"))
    .map(fields => ({
      type: CaseArray.TypeSignature,
      fields: fields.map(x => ({ type: CaseAnnotatedExpression.TypeSignature, annotations: [], value: x })),
    }))
    .desc("array")
}

function ruleDeclaration(lang: LanguageFoam): Parser<CaseDeclaration.Type> {
  return seq(lang.ruleString, alt2(lang.ruleAnnotatedExpression, lang.ruleMacro))
    .map(([key, value]) => ({
      type: CaseDeclaration.TypeSignature,
      key: key,
      value: value,
    }))
    .desc("declaration")
}

function ruleRegexDeclaration(lang: LanguageFoam): Parser<CaseRegexDeclaration.Type> {
  return seq(lang.ruleDoubleQuote, alt2(lang.ruleAnnotatedExpression, lang.ruleMacro))
    .map(([key, value]) => ({
      type: CaseRegexDeclaration.TypeSignature,
      pattern: key,
      value: value,
    }))
    .desc("regexDeclaration")
}

function ruleDictionary(lang: LanguageFoam): Parser<CaseDictionary.Type> {
  return word("{")
    .then(alt3(
      lang.ruleDeclaration,
      lang.ruleRegexDeclaration,
      lang.ruleMacro,
    ).many())
    .skip(word("}"))
    .map(entries => ({
      type: CaseDictionary.TypeSignature,
      fields: entries,
    }))
    .desc("dictionary")
}

function ruleFoamDictionary(lang: LanguageFoam): Parser<CaseDictionary.Type> {
  return lang.ruleDeclaration.many()
    .map(entries => ({
      type: CaseDictionary.TypeSignature,
      fields: entries,
    }))
    .desc("foamDictionary")
}

function ruleFoamArray(lang: LanguageFoam): Parser<CaseDictionary.Type> {
  return seq(
    lang.ruleDeclaration,
    lang.ruleNumber,
    word("("),
    lang.ruleDeclaration.many(),
    word(")"),
  )
    .map(([header, length, open, pairs, close]) => ({
      type: CaseDictionary.TypeSignature,
      fields: [header, ...pairs],
    }))
    .desc("foamArray")
}

function ruleFoam(lang: LanguageFoam): Parser<CaseDictionary.Type> {
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

export function parse(input: string): Either<Exception<typeof ParserExceptionCannotParse>, CaseDictionary.Type> {
  try {
    return right(foamLang.ruleFoam.tryParse(input))
  } catch (e) {
    return left(fail(ParserExceptionCannotParse, e))
  }
}