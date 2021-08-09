import {predicate} from "./helpers";
import {CaseAnnotatedExpression} from "./caseAnnotatedExpression";
import {CaseMacro} from "./caseMacro";

export namespace CaseRegexDeclaration {
  export const TypeSignature = "case.regexDeclaration" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    pattern: string;
    value: CaseAnnotatedExpression.Type | CaseMacro.Type;
  }
}
