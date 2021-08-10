import {ParserExceptionCannotParse, Primitive, Spec, word} from "./index";
import {alt, createLanguage, Parser, seq, TypedLanguage} from "parsimmon";
import {CaseDeclaration} from "../case/caseDeclaration";
import {KeyFoamFile} from "../case";
import {CaseFaceList} from "../case/caseFaceList";
import {Either, left, right} from "fp-chainer/lib/either";
import {Exception, fail} from "../utils";

export namespace FaceList {
  function ruleHeaderEntry<Lang extends Language>(lang: Lang): Parser<CaseDeclaration.Type> {
    return alt(
      seq(word("version"), lang.ruleString, word(";")),
      seq(word("format"), lang.ruleString, word(";")),
      seq(word("class"), word("faceList"), word(";")),
      seq(word("object"), lang.ruleString, word(";")),
      seq(word("location"), lang.ruleString, word(";")),
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

  function ruleFaceDefinition<Lang extends Language>(lang: Lang): Parser<number[]> {
    return seq(
      lang.ruleNumber,
      word("("),
      lang.ruleNumber.many(),
      word(")"),
    )
      .map(([length, open, data, close]) => data)
      .desc("ruleFaceDefinition")
  }

  function ruleDataArray<Lang extends Language>(lang: Lang): Parser<number[][]> {
    return seq(
      lang.ruleNumber,
      word("("),
      lang.ruleFaceDefinition.many(),
      word(")"),
    )
      .map(([length, open, data, close]) => data)
      .desc("ruleDataArray")
  }

  function ruleFaceList<Lang extends Language>(lang: Lang): Parser<CaseFaceList.Type> {
    return seq(
      lang.ruleHeader,
      lang.ruleDataArray,
    )
      .map(([header, dataArray]) => CaseFaceList.build("", "", "", dataArray))
      .desc("ruleFaceList")
  }

  export const rules = {
    ...Primitive.rules,
    ruleHeaderEntry,
    ruleHeader,
    ruleFaceDefinition,
    ruleDataArray,
    ruleFaceList,
  }

  export type Language = TypedLanguage<Spec<typeof rules>>;

  const language = createLanguage(rules);

  export function parse(input: string): Either<Exception<typeof ParserExceptionCannotParse>, CaseFaceList.Type> {
    try {
      return right(language.ruleFaceList.tryParse(input))
    } catch (e) {
      return left(fail(ParserExceptionCannotParse, e))
    }
  }
}