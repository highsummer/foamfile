import {predicate} from "./helpers";

export namespace CaseUnparsed {
  export const TypeSignature = "case.unparsed" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    data: string;
  }
}
