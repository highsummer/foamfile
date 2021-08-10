import {FromGuard, Sum, unionPredicate} from "./helpers";
import {CaseStruct} from "./caseStruct";
import {CaseLiteral, CaseLiteralLike} from "./caseLiteral";
import {CaseUnparsed} from "./caseUnparsed";
import {Either, left, right} from "fp-chainer/lib/either";
import {assertNever, fail} from "../utils";
import {fromNullable} from "fp-chainer/lib/option";
import {
  CaseGetExceptionMacro,
  CaseGetExceptionNoSuchKey,
  CaseGetExceptions,
  CaseGetExceptionUnreachable,
  CaseSetExceptions,
  CaseSetExceptionUnreachable,
  head,
  isThis,
  Key,
  representKey,
  setOnNew,
  tail
} from "./index";
import {CaseAnnotatedExpression} from "./caseAnnotatedExpression";
import {CaseMacro} from "./caseMacro";
import {CaseDictionary} from "./caseDictionary";
import {CaseArray} from "./caseArray";
import {CaseDeclaration} from "./caseDeclaration";
import {CaseScalarList} from "./caseScalarList";
import {CaseVectorList} from "./caseVectorList";

export type CaseExpressionLike = CaseExpression.Type | CaseLiteralLike;

export namespace CaseExpression {
  export const guards = [
    () => CaseStruct.is,
    () => CaseLiteral.is,
    () => CaseUnparsed.is,
    () => CaseScalarList.is,
    () => CaseVectorList.is,
  ] as const;
  export type Enum = FromGuard<typeof guards>;
  export type Type = Sum<Enum>;
  export const is = unionPredicate(...guards)<Type>();

  export function to(x: CaseExpressionLike): Type {
    if (typeof x === "object" && "type" in x && (is(x) && !CaseLiteral.is(x))) {
      return x
    } else {
      return CaseLiteral.to(x)
    }
  }
  
  export function get(expr: Type, key: Key): Either<CaseGetExceptions, CaseAnnotatedExpression.Type> {
    if (isThis(key)) {
      return left(fail(CaseGetExceptionUnreachable, { expr: expr, key: key }))
    } else {
      if (CaseMacro.is(expr)) {
        return left(fail(CaseGetExceptionMacro, "unexpanded macro found"))
      } else if (CaseDictionary.is(expr)) {
        const name = head(key);
        if (name === undefined) {
          return left(fail(CaseGetExceptionNoSuchKey, "key reached the end of search"))
        } else {
          return fromNullable(expr.fields.find(entry => CaseDeclaration.match(entry, name.toString())))
            .mapLeft(() => fail(CaseGetExceptionNoSuchKey, `no such key '${representKey(key)}'`))
            .chain(data => CaseMacro.is(data) ? left(fail(CaseGetExceptionMacro, "unexpanded macro found")) : right(data))
            .chain(({ value }) => CaseMacro.is(value) ? left(fail(CaseGetExceptionMacro, "unexpanded macro found")) : CaseAnnotatedExpression.get(value, tail(key)))
        }
      } else if (CaseArray.is(expr)) {
        const name = head(key);
        const e: Either<CaseGetExceptions, CaseAnnotatedExpression.Type | CaseMacro.Type> = typeof name === "number" ?
          (expr.fields[name] !== undefined ? right(expr.fields[name]) : left(fail(CaseGetExceptionNoSuchKey, `index out of range`))) :
          left(fail(CaseGetExceptionNoSuchKey, `cannot index array with string`));
        return e
          .chain(data => CaseMacro.is(data) ? left(fail(CaseGetExceptionMacro, "unexpanded macro found")) : right(data))
          .chain(data => CaseAnnotatedExpression.get(data, tail(key)))
      } else {
        return left(fail(CaseGetExceptionNoSuchKey, `expression reached terminal but key is '${representKey(key)}'`))
      }
    }
  }
  
  export function set(expr: Type, key: Key, value: CaseAnnotatedExpression.Type): Either<CaseSetExceptions, Type> {
    if (isThis(key)) {
      return left(fail(CaseSetExceptionUnreachable, { expr: expr, key: key }))
    } else {
      if (CaseDictionary.is(expr)) {
        return CaseDictionary.set(expr, key, value)
      } else if (CaseArray.is(expr)) {
        return CaseArray.set(expr, key, value)
      } else {
        return setOnNew(key, value)
      }
    }
  }

  export function print(x: Type): string {
    if (CaseStruct.is(x)) {
      return CaseStruct.print(x)
    } else if (CaseLiteral.is(x)) {
      return CaseLiteral.print(x)
    } else if (CaseUnparsed.is(x)) {
      return `/* unparsed stubs */\n\n${x.data}\n\n`
    } else if (CaseVectorList.is(x)) {
      return CaseVectorList.print(x)
    } else if (CaseScalarList.is(x)) {
      return CaseScalarList.print(x)
    } else {
      assertNever(x);
    }
  }
}
