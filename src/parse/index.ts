// Possible classes
// 'IOobject', 'cellList', 'dictionary', 'faceList',
// 'featureEdgeMesh', 'labelList', 'pointScalarField',
// 'pointVectorField', 'polyBoundaryMesh', 'uniformDimensionedScalarField',
// 'uniformDimensionedVectorField', 'vectorField', 'volScalarField',
// 'volSymmTensorField', 'volVectorField'

import {alt, Parser, regexp, seq, string, TypedLanguage, whitespace} from "parsimmon";
import {Dimension} from "../case";
import {Vector} from "../case/helpers";

const commentSingle = regexp(/\/\/[^\n]*/)
  .desc("commentSingle");
const commentMulti = seq(string("/*"), regexp(/(?!\*\/)((\*[^*]*)|([^*]+))/).many(), string("*/"))
  .desc("commentMulti");

export const UnnamedDefaultKeySymbol = "!unnamed_default";

export function token<T>(parser: Parser<T>) {
  return alt(whitespace, commentSingle, commentMulti).many().then(parser);
}

export function word(str: string) {
  return string(str).thru(token);
}

export function alt2<A, B>(a: Parser<A>, b: Parser<B>): Parser<A | B> {
  return alt(a, b) as Parser<A | B>
}

export function alt3<A, B, C>(a: Parser<A>, b: Parser<B>, c: Parser<C>): Parser<A | B | C> {
  return alt(a, b, c) as Parser<A | B | C>
}

export function alt4<A, B, C, D>(a: Parser<A>, b: Parser<B>, c: Parser<C>, d: Parser<D>): Parser<A | B | C | D> {
  return alt(a, b, c, d) as Parser<A | B | C | D>
}

export function option<T>(p: Parser<T>): Parser<T | undefined> {
  return p.atMost(1).map(xs => xs.length === 1 ? xs[0] : undefined)
}

export type TypeOf<T> = T extends (...args: any[]) => Parser<infer R> ? R : never;
export type Spec<T> = { [K in keyof T]: TypeOf<(T)[K]> };

export namespace Primitive {
  function ruleNumber<Lang extends Language>(lang: Lang): Parser<number> {
    return token(regexp(/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/))
      .map(Number)
      .desc("number")
  }

  function ruleBoolean<Lang extends Language>(lang: Lang): Parser<boolean> {
    return alt(
      word("true").map(() => true),
      word("on").map(() => true),
      word("false").map(() => false),
      word("off").map(() => false),
    ).desc("boolean")
  }

  function ruleString<Lang extends Language>(lang: Lang): Parser<string> {
    return token(regexp(/[^\s{};]+/))
      .desc("string")
  }

  function ruleDoubleQuote<Lang extends Language>(lang: Lang): Parser<string> {
    return token(regexp(/"([^\\"]|\\\\|\\")*"/).map(_ => _.slice(1, -1)))
      .desc("doubleQuote")
  }

  function ruleDimension<Lang extends Language>(lang: Lang): Parser<Dimension> {
    return word("[")
      .then(ruleNumber(lang).many())
      .map(values => (values as Dimension))
      .skip(word("]"))
      .desc("dimension")
  }

  function ruleVector<Lang extends Language>(lang: Lang): Parser<Vector> {
    return word("(")
      .then(seq(lang.ruleNumber, lang.ruleNumber, lang.ruleNumber))
      .skip(word(")"))
      .desc("vector")
  }

  export const rules = {
    ruleNumber,
    ruleBoolean,
    ruleString,
    ruleDoubleQuote,
    ruleDimension,
    ruleVector,
  };

  export type Language = TypedLanguage<Spec<typeof rules>>;
}

export const ParserExceptionCannotParse = "core.case.parser.CannotParse" as const;
