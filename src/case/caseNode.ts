import {FromGuard, Sum, unionPredicate} from "./helpers";
import {CaseAnnotatedExpression} from "./caseAnnotatedExpression";
import {CaseExpression} from "./caseExpression";
import {CaseDeclaration} from "./caseDeclaration";
import {CaseRegexDeclaration} from "./caseRegexDeclaration";
import {CaseMacro} from "./caseMacro";

export namespace CaseNode {
  export const guards = [
    () => CaseAnnotatedExpression.is,
    () => CaseExpression.is,
    () => CaseDeclaration.is,
    () => CaseRegexDeclaration.is,
    () => CaseMacro.is,
  ] as const;
  export type Enum = FromGuard<typeof guards>;
  export type Type = Sum<Enum>;
  export const is = unionPredicate(...guards)<Type>();
}
