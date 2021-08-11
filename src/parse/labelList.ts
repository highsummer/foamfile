import {ParserExceptionCannotParse, Primitive, Spec, token, word} from "./index";
import {alt, createLanguage, Parser, seq, TypedLanguage} from "parsimmon";
import {CaseDeclaration} from "../case/caseDeclaration";
import {KeyFoamFile} from "../case";
import {CaseFaceList} from "../case/caseFaceList";
import {Either, left, right} from "fp-chainer/lib/either";
import {Exception, fail} from "../utils";
import {CaseLabelList} from "../case/caseLabelList";

export namespace LabelList {
  function ruleHeaderEntry<Lang extends Language>(lang: Lang): Parser<CaseDeclaration.Type> {
    return alt(
      seq(word("version"), lang.ruleString, word(";")),
      seq(word("format"), lang.ruleString, word(";")),
      seq(word("class"), word("labelList"), word(";")),
      seq(word("object"), lang.ruleString, word(";")),
      seq(word("location"), lang.ruleString, word(";")),
      seq(word("note"), lang.ruleString, word(";")),
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

  function ruleDataArray<Lang extends Language>(lang: Lang): Parser<number[]> {
    return seq(
      lang.ruleNumber,
      word("("),
      lang.ruleNumber.many(),
      word(")"),
    )
      .map(([length, open, data, close]) => data)
      .desc("ruleDataArray")
  }

  function ruleLabelList<Lang extends Language>(lang: Lang): Parser<CaseLabelList.Type> {
    return seq(
      lang.ruleHeader,
      lang.ruleDataArray,
    )
      .skip(token(word("")))
      .map(([header, dataArray]) => CaseLabelList.build("", "", "", dataArray))
      .desc("ruleLabelList")
  }

  export const rules = {
    ...Primitive.rules,
    ruleHeaderEntry,
    ruleHeader,
    ruleDataArray,
    ruleLabelList,
  }

  export type Language = TypedLanguage<Spec<typeof rules>>;

  const language = createLanguage(rules);

  export function parse(input: string): Either<Exception<typeof ParserExceptionCannotParse>, CaseLabelList.Type> {
    try {
      return right(language.ruleLabelList.tryParse(input))
    } catch (e) {
      return left(fail(ParserExceptionCannotParse, e))
    }
  }
}