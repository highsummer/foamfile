import {predicate, Vector} from "./helpers";

export namespace CaseVectorList {
  export const TypeSignature = "case.vectorList" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    data: Vector[],
  }

  export function build(data: Vector[]): Type {
    return {
      type: TypeSignature,
      data: data,
    }
  }

  export function print(x: Type): string {
    return `nonuniform List<vector>
${x.data.length}
(
${x.data.map(v => `(${v.join(" ")})`).join("\n")}
)
;`
  }
}

