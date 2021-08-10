import {predicate, Vector} from "./helpers";

export namespace CaseScalarList {
  export const TypeSignature = "case.scalarList" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    data: number[],
  }

  export function build(data: number[]): Type {
    return {
      type: TypeSignature,
      data: data,
    }
  }

  export function print(x: Type): string {
    return `nonuniform List<scalar>
${x.data.length}
(
${x.data.join("\n")}
)
;`
  }
}
