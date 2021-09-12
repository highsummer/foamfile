import {predicate} from "./helpers";
import {CaseExpression, CaseExpressionLike} from "./caseExpression";
import {CaseLiteral, CaseLiteralLike} from "./caseLiteral";
import {CaseMacro} from "./caseMacro";
import {Either, left, right} from "fp-chainer/either";
import {CaseGetExceptionMacro, CaseGetExceptions, CaseSetExceptionMacro, CaseSetExceptions, isThis, Key} from "./index";
import {fail} from "fp-chainer/failure";

export type CaseAnnotatedExpressionLike = CaseAnnotatedExpression.Type | CaseExpressionLike;

export namespace CaseAnnotatedExpression {
  export const TypeSignature = "case.annotatedExpression" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    value: CaseExpression.Type | CaseMacro.Type;
    annotations: (CaseLiteral.Type | CaseMacro.Type)[];
  }

  export function build(value: CaseExpressionLike, ...annotations: CaseLiteralLike[]): Type {
    return {
      type: TypeSignature,
      value: CaseExpression.to(value),
      annotations: annotations.map(CaseLiteral.to),
    }
  }

  export function to(x: CaseAnnotatedExpressionLike): Type {
    if (typeof x === "object" && "type" in x && is(x)) {
      return x
    } else {
      return build(CaseExpression.to(x))
    }
  }

  export function get(anno: Type, key: Key): Either<CaseGetExceptions, Type> {
    if (isThis(key)) {
      return right(anno)
    } else if (CaseMacro.is(anno.value)) {
      return left(fail(CaseGetExceptionMacro, "unexpanded macro found"))
    } else {
      return CaseExpression.get(anno.value, key)
    }
  }

  export function set(anno: Type, key: Key, value: Type): Either<CaseSetExceptions, Type> {
    if (isThis(key)) {
      return right(value)
    } else if (CaseMacro.is(anno.value)) {
      return left(fail(CaseSetExceptionMacro, "unexpanded macro found"))
    } else {
      return CaseExpression.set(anno.value, key, value)
        .map(value => ({
          ...anno,
          value: value,
        }))
    }
  }

  export function print(x: Type, columnWidths?: number[]): string {
    return `${[...x.annotations.map((l, i) => (CaseMacro.is(l) ? CaseMacro.print(l) : CaseLiteral.print(l)).padEnd(columnWidths?.[i] ?? 0)), CaseMacro.is(x.value) ? CaseMacro.print(x.value) : CaseExpression.print(x.value)].join(" ")}`
  }
}
