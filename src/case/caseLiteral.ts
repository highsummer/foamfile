import {
  FromGuard, predicate,
  Sum,
  unionPredicate, Vector
} from "./helpers";
import {Dimension} from "./parser";
import {assertNever} from "../utils";

export type CaseLiteralLike = CaseLiteral.Type | Vector | string | number | boolean;

export namespace CaseStringLiteral {
  export const TypeSignature = "case.literal.string" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    data: string;
  }
}

export namespace CaseBooleanLiteral {
  export const TypeSignature = "case.literal.boolean" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    data: boolean;
  }
}

export namespace CaseNumericLiteral {
  export const TypeSignature = "case.literal.numeric" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    data: number | Vector;
    dimension?: Dimension;
  }
}

export namespace CaseDimensionLiteral {
  export const TypeSignature = "case.dimensionLiteral" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    data: Dimension;
  }
}

export namespace CaseLiteral {
  export const guards = [
    CaseStringLiteral.is,
    CaseBooleanLiteral.is,
    CaseNumericLiteral.is,
    CaseDimensionLiteral.is,
  ] as const;
  export type Enum = FromGuard<typeof guards>;
  export type Type = Sum<Enum>;
  export const is = unionPredicate(...guards)<Type>();

  export function to(x: CaseLiteralLike): Type {
    if (typeof x === "boolean") {
      return {
        type: CaseBooleanLiteral.TypeSignature,
        data: x,
      }
    } else if (typeof x === "number") {
      return {
        type: CaseNumericLiteral.TypeSignature,
        dimension: undefined,
        data: x,
      }
    } else if (typeof x === "string") {
      return {
        type: CaseStringLiteral.TypeSignature,
        data: x,
      }
    } else if (Array.isArray(x)) {
      return {
        type: CaseNumericLiteral.TypeSignature,
        dimension: undefined,
        data: x,
      }
    } else {
      return x
    }
  }

  export function print(x: Type): string {
    if (CaseStringLiteral.is(x)) {
      if (/[\s;"]/.exec(x.data) !== null) {
        return `"${x.data.replace("\"", "\\\"")}"`
      } else {
        return x.data
      }
    } else if (CaseNumericLiteral.is(x)) {
      const value = typeof x.data === "number" ? x.data.toString() : `(${x.data.map(String).join(" ")})`;
      const dimension = x.dimension !== undefined ? `[${x.dimension.map(String).join(" ")}] ` : "";
      return `${dimension}${value}`
    } else if (CaseBooleanLiteral.is(x)) {
      return x.data ? "true" : "false"
    } else if (CaseDimensionLiteral.is(x)) {
      return `[${x.data.map(e => `${e}`).join(" ")}]`
    } else {
      assertNever(x);
    }
  }
}
