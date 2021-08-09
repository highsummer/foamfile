import {FromGuard, Sum, unionPredicate} from "./helpers";
import {CaseDictionary} from "./caseDictionary";
import {CaseArray} from "./caseArray";
import {assertNever} from "../utils";

export namespace CaseStruct {
  export const guards = [
    CaseDictionary.is,
    CaseArray.is,
  ] as const;
  export type Enum = FromGuard<typeof guards>;
  export type Type = Sum<Enum>;
  export const is = unionPredicate(...guards)<Type>();

  export function print(x: Type): string {
    if (CaseDictionary.is(x)) {
      return CaseDictionary.print(x)
    } else if (CaseArray.is(x)) {
      return CaseArray.print(x)
    } else {
      assertNever(x);
    }
  }
}
