import {predicate} from "./helpers";
import {CaseMacro} from "./caseMacro";
import {CaseAnnotatedExpression, CaseAnnotatedExpressionLike} from "./caseAnnotatedExpression";
import {Either, left, right} from "fp-chainer/either";
import {
  arrayGet,
  arraySet,
  CaseSetExceptionMacro,
  CaseSetExceptions,
  CaseSetExceptionUnreachable,
  head,
  Key,
  setOnNew,
  tail
} from "./index";
import {CaseExpression} from "./caseExpression";
import {CaseLiteral} from "./caseLiteral";
import {fail} from "fp-chainer/failure";

export namespace CaseArray {
  export const TypeSignature = "case.array" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    fields: (CaseAnnotatedExpression.Type | CaseMacro.Type)[];
  }

  export function build(...elements: CaseAnnotatedExpressionLike[]): Type {
    return {
      type: TypeSignature,
      fields: elements.map(CaseAnnotatedExpression.to),
    }
  }

  export const empty = {
    type: TypeSignature,
    fields: [],
  } as Type;

  export function set(expr: Type, key: Key, value: CaseAnnotatedExpression.Type): Either<CaseSetExceptions, CaseExpression.Type> {
    const name = head(key);
    if (name === undefined) {
      return left(fail(CaseSetExceptionUnreachable, "key reached the end of search"))
    } else if (typeof name === "number") {
      return arrayGet(expr.fields, name)
        .chainLeft(() => right(value))
        .chain(old => CaseMacro.is(old) ? left(fail(CaseSetExceptionMacro, "unexpanded macro found")) : right(old))
        .chain(old => CaseAnnotatedExpression.set(old, tail(key), value))
        .chain(updated => arraySet(expr.fields, name, updated)
          .map(fields => ({
            ...expr,
            fields: fields,
          }))
          .mapLeft(() => fail(CaseSetExceptionUnreachable, { expr: expr, key: key }))
        )
    } else {
      return setOnNew(key, value)
    }
  }

  export function print(x: Type): string {
    return `(${x.fields.map(value => {
      if (CaseMacro.is(value)) {
        return CaseMacro.print(value)
      } else {
        return `${[...value.annotations.map(x => CaseMacro.is(x) ? CaseMacro.print(x) : CaseLiteral.print(x)), CaseMacro.is(value.value) ? CaseMacro.print(value.value) : CaseExpression.print(value.value)].join(" ")}`
      }
    }).join(" ")})`
  }
}
