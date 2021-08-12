import {alt, Parser, regexp, seq, string, TypedLanguage} from "parsimmon";
import {
  CaseMacro,
  CaseMacroIdentifier,
  CaseMacroParentSearch, CaseMacroPreprocessor,
  CaseMacroQualifiedName,
  CaseMacroRootSearch
} from "../case/caseMacro";
import {alt2, alt3, alt4, option, Primitive, Spec, token, word} from "./index";

export namespace Macro {
  function ruleMacroInner<Lang extends Language>(lang: Lang): Parser<CaseMacro.Type> {
    return alt3(
      lang.ruleParentSearch,
      lang.ruleQualifiedName,
      lang.ruleIdentifier,
    )
      .desc("macro")
  }

  function ruleRootSearch<Lang extends Language>(lang: Lang): Parser<CaseMacroRootSearch.Type> {
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

  function ruleParentSearch<Lang extends Language>(lang: Lang): Parser<CaseMacroParentSearch.Type> {
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

  function ruleQualifiedName<Lang extends Language>(lang: Lang): Parser<CaseMacroQualifiedName.Type> {
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

  function ruleIdentifier<Lang extends Language>(lang: Lang): Parser<CaseMacroIdentifier.Type> {
    return regexp(/[a-zA-Z0-9_]+/)
      .map(name => ({
        type: CaseMacroIdentifier.TypeSignature,
        name: name,
      }))
      .desc("identifier")
  }

  function rulePreprocessor<Lang extends Language>(lang: Lang): Parser<CaseMacroPreprocessor.Type> {
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

  function ruleMacroOuter<Lang extends Language>(lang: Lang): Parser<CaseMacro.Type> {
    return alt2(
      seq(
        string("$"),
        option(string("{")),
        alt4(
          lang.ruleRootSearch,
          lang.ruleParentSearch,
          lang.ruleQualifiedName,
          lang.ruleIdentifier,
        ),
        option(string("}")),
        option(word(";")),
      )
        .map(([_, open, macro, close, semicolon]) => macro)
        .thru(token),
      lang.rulePreprocessor
    )
      .desc("macro")
  }

  export const rules = {
    ...Primitive.rules,
    ruleMacroInner,
    ruleMacro: ruleMacroOuter,
    ruleRootSearch,
    ruleParentSearch,
    ruleQualifiedName,
    ruleIdentifier,
    rulePreprocessor,
  };

  type Language = TypedLanguage<Spec<typeof rules>>;
}