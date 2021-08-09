import {predicate} from "./helpers";
import {CaseAnnotatedExpression, CaseAnnotatedExpressionLike} from "./caseAnnotatedExpression";
import {CaseMacro} from "./caseMacro";
import {assertNever} from "../utils";
import {CaseDictionary} from "./caseDictionary";
import {CaseRegexDeclaration} from "./caseRegexDeclaration";

export namespace CaseDeclaration {
  export const TypeSignature = "case.declaration" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    key: string;
    value: CaseAnnotatedExpression.Type | CaseMacro.Type;
  }

  export function build(k: string, v: CaseAnnotatedExpressionLike): Type {
    return {
      type: TypeSignature,
      key: k,
      value: CaseAnnotatedExpression.to(v),
    }
  }
  
  export function match(entry: CaseDictionary.Type["fields"][number], key: string) {
    if (CaseMacro.is(entry)) {
      return false
    } else if (CaseRegexDeclaration.is(entry)) {
      return new RegExp(entry.pattern).exec(key) !== null
    } else if (CaseDeclaration.is(entry)) {
      return entry.key === key
    } else {
      assertNever(entry);
    }
  }
}
