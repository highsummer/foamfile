import {alt, createLanguage, Parser, regexp, seq, TypedLanguage} from "parsimmon";
import {Either, left, right} from "fp-chainer/either";
import {
  CaseBooleanLiteral,
  CaseDimensionLiteral,
  CaseLiteral,
  CaseNumericLiteral,
  CaseStringLiteral
} from "../case/caseLiteral";
import {CaseStruct} from "../case/caseStruct";
import {CaseExpression} from "../case/caseExpression";
import {CaseAnnotatedExpression} from "../case/caseAnnotatedExpression";
import {CaseUnparsed} from "../case/caseUnparsed";
import {CaseArray} from "../case/caseArray";
import {CaseDeclaration} from "../case/caseDeclaration";
import {CaseRegexDeclaration} from "../case/caseRegexDeclaration";
import {CaseDictionary} from "../case/caseDictionary";
import {alt2, alt3, alt4, option, ParserExceptionCannotParse, Spec, token, word} from "./index";
import {Macro} from "./macro";
import {CaseVectorList} from "../case/caseVectorList";
import {CaseScalarList} from "../case/caseScalarList";
import {fail, Failure} from "fp-chainer/failure";

export namespace VolField {
  function ruleBooleanLiteral(lang: Language): Parser<CaseBooleanLiteral.Type> {
    return lang.ruleBoolean
      .map(x => {
        return ({type: CaseBooleanLiteral.TypeSignature, data: x});
      })
      .desc("booleanLiteral")
  }

  function ruleStringLiteral(lang: Language): Parser<CaseStringLiteral.Type> {
    return alt(
      lang.ruleDoubleQuote,
      lang.ruleString,
    )
      .map(x => ({ type: CaseStringLiteral.TypeSignature, data: x }))
      .desc("stringLiteral")
  }

  function ruleNumericLiteral(lang: Language): Parser<CaseNumericLiteral.Type> {
    return seq(
      option(lang.ruleDimension),
      alt2(lang.ruleVector, lang.ruleNumber),
    )
      .map(([dim, val]) => ({ type: CaseNumericLiteral.TypeSignature, dimension: dim, data: val }))
      .desc("numericLiteral")
  }

  function ruleDimensionLiteral(lang: Language): Parser<CaseDimensionLiteral.Type> {
    return lang.ruleDimension
      .map(dim => ({ type: CaseDimensionLiteral.TypeSignature, data: dim }))
      .desc("dimensionLiteral")
  }

  function ruleLiteral(lang: Language): Parser<CaseLiteral.Type> {
    return alt4(
      lang.ruleBooleanLiteral,
      lang.ruleNumericLiteral,
      lang.ruleDimensionLiteral,
      lang.ruleStringLiteral,
    )
      .desc("literal")
  }

  function ruleStruct(lang: Language): Parser<CaseStruct.Type> {
    return alt2(
      lang.ruleArray,
      lang.ruleDictionary,
    )
      .desc("struct")
  }

  function ruleExpression(lang: Language): Parser<CaseExpression.Type> {
    return alt3(
      lang.ruleLiteral,
      lang.ruleArray,
      lang.ruleDictionary,
    )
      .desc("expression")
  }

  function ruleDataList(lang: Language): Parser<CaseAnnotatedExpression.Type> {
    return alt4(
      seq(
        word("uniform"),
        lang.ruleVector,
        option(word(";")).map(o => o ?? ""),
      )
        .map(([uniform, vector]) => CaseAnnotatedExpression.build(vector, uniform)),
      seq(
        word("uniform"),
        lang.ruleNumber,
        option(word(";")).map(o => o ?? ""),
      )
        .map(([uniform, scalar]) => CaseAnnotatedExpression.build(scalar, uniform)),
      seq(
        word("nonuniform"),
        word("List<vector>"),
        lang.ruleNumber.map(x => x.toString()),
        word("("),
        lang.ruleVector.many(),
        word(")"),
        option(word(";")).map(o => o ?? ""),
      )
        .map(([nonuniform, list, length, open, data, close, semicolon]) => CaseAnnotatedExpression.build(CaseVectorList.build(data))),
      seq(
        word("nonuniform"),
        word("List<scalar>"),
        lang.ruleNumber.map(x => x.toString()),
        word("("),
        lang.ruleNumber.many(),
        word(")"),
        option(word(";")).map(o => o ?? ""),
      )
        .map(([nonuniform, list, length, open, data, close, semicolon]) => CaseAnnotatedExpression.build(CaseScalarList.build(data))),
    )
      .desc("ruleDataList")
  }

  function ruleAnnotatedExpression(lang: Language): Parser<CaseAnnotatedExpression.Type> {
    return alt4(
      lang.ruleDataList
        .map(dataList => [dataList.annotations, dataList.value] as const)
        .desc("annotatedDataList"),
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

  function ruleArray(lang: Language): Parser<CaseArray.Type> {
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

  function ruleDeclaration(lang: Language): Parser<CaseDeclaration.Type> {
    return seq(lang.ruleString, alt2(lang.ruleAnnotatedExpression, lang.ruleMacro))
      .map(([key, value]) => ({
        type: CaseDeclaration.TypeSignature,
        key: key,
        value: value,
      }))
      .desc("declaration")
  }

  function ruleRegexDeclaration(lang: Language): Parser<CaseRegexDeclaration.Type> {
    return seq(lang.ruleDoubleQuote, alt2(lang.ruleAnnotatedExpression, lang.ruleMacro))
      .map(([key, value]) => ({
        type: CaseRegexDeclaration.TypeSignature,
        pattern: key,
        value: value,
      }))
      .desc("regexDeclaration")
  }

  function ruleDictionary(lang: Language): Parser<CaseDictionary.Type> {
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

  function ruleFoamDictionary(lang: Language): Parser<CaseDictionary.Type> {
    return lang.ruleDeclaration.many()
      .map(entries => ({
        type: CaseDictionary.TypeSignature,
        fields: entries,
      }))
      .desc("foamDictionary")
  }

  function ruleFoamArray(lang: Language): Parser<CaseDictionary.Type> {
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

  function ruleFoam(lang: Language): Parser<CaseDictionary.Type> {
    return alt2(lang.ruleFoamArray, lang.ruleFoamDictionary)
      .skip(token(word("")))
      .desc("foam")
  }

  const rules = {
    ...Macro.rules,

    ruleBooleanLiteral,
    ruleStringLiteral,
    ruleNumericLiteral,
    ruleDimensionLiteral,
    ruleLiteral,
    ruleStruct,
    ruleExpression,
    ruleDataList,
    ruleAnnotatedExpression,
    ruleArray,
    ruleDeclaration,
    ruleRegexDeclaration,
    ruleDictionary,
    ruleFoamDictionary,
    ruleFoamArray,
    ruleFoam,
  };

  type Language = TypedLanguage<Spec<typeof rules>>;

  const foamLang = createLanguage(rules);

  export function parse(input: string): Either<Failure<typeof ParserExceptionCannotParse, unknown>, CaseDictionary.Type> {
    try {
      return right(foamLang.ruleFoam.tryParse(input))
    } catch (e) {
      return left(fail(ParserExceptionCannotParse, e))
    }
  }
}
