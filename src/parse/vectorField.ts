import {ParserExceptionCannotParse, Primitive, Spec, word} from "./index";
import {alt, createLanguage, Parser, seq, TypedLanguage} from "parsimmon";
import {CaseDeclaration} from "../case/caseDeclaration";
import {KeyFoamFile} from "../case";
import {Vector} from "../case/helpers";
import {CaseVectorField} from "../case/caseVectorField";
import {CaseStringLiteral} from "../case/caseLiteral";
import {Either, left, right} from "fp-chainer/lib/either";
import {Exception, fail} from "../utils";
import {CaseDictionary} from "../case/caseDictionary";

export namespace VectorField {
  function ruleHeaderEntry<Lang extends Language>(lang: Lang): Parser<CaseDeclaration.Type> {
    return alt(
      seq(word("version"), lang.ruleString, word(";")),
      seq(word("format"), lang.ruleString, word(";")),
      seq(word("class"), word("vectorField"), word(";")),
      seq(word("object"), lang.ruleString, word(";")),
    )
      .map(([key, value, terminator]) => CaseDeclaration.build(key, value))
      .desc("ruleHeaderEntry")
  }

  function ruleHeader<Lang extends Language>(lang: Lang): Parser<CaseDeclaration.Type[]> {
    return seq(
      word(KeyFoamFile),
      word("{"),
      lang.ruleHeaderEntry.many(),
      word("}"),
    )
      .map(([key, open, entries, close]) => entries)
      .desc("ruleHeader")
  }

  function ruleVector<Lang extends Language>(lang: Lang): Parser<Vector> {
    return seq(
      word("("),
      lang.ruleNumber, lang.ruleNumber, lang.ruleNumber,
      word(")"),
    )
      .map(([open, _0, _1, _2, close]) => [_0, _1, _2] as Vector)
      .desc("ruleVector")
  }

  function ruleFieldArray<Lang extends Language>(lang: Lang): Parser<Vector[]> {
    return seq(
      lang.ruleNumber,
      word("("),
      lang.ruleVector.many(),
      word(")"),
    )
      .map(([length, open, data, close]) => data)
      .desc("ruleFieldArray")
  }

  function ruleVectorField<Lang extends Language>(lang: Lang): Parser<CaseVectorField.Type> {
    return seq(
      lang.ruleHeader,
      lang.ruleFieldArray,
    )
      .map(([header, fieldArray]) => CaseVectorField.build("", "", "", fieldArray))
      .desc("ruleVectorField")
  }

  export const rules = {
    ...Primitive.rules,
    ruleHeaderEntry,
    ruleHeader,
    ruleVector,
    ruleFieldArray,
    ruleVectorField,
  }

  export type Language = TypedLanguage<Spec<typeof rules>>;

  const language = createLanguage(rules);

  export function parse(input: string): Either<Exception<typeof ParserExceptionCannotParse>, CaseVectorField.Type> {
    try {
      return right(language.ruleVectorField.tryParse(input))
    } catch (e) {
      return left(fail(ParserExceptionCannotParse, e))
    }
  }
}