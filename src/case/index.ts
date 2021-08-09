import {Exception, fail} from "../utils";
import {Either, left, right} from "fp-chainer/lib/either";
import {CaseDictionary} from "./caseDictionary";
import {CaseArray} from "./caseArray";
import {CaseAnnotatedExpression} from "./caseAnnotatedExpression";
import {CaseExpression} from "./caseExpression";

const KeySeparator = ".";
export type Key = Token[];
export type Token = number | string;

export function representKey(key: Key): string {
  return key
    .map(name => name.toString())
    .join(KeySeparator)
}

export function head(key: Key): Token | undefined {
  return key[0]
}

export function tail(key: Key): Key {
  return key.slice(1)
}

export function isThis(key: Key): boolean {
  return key.length === 0
}

export const CaseGetExceptionNoSuchFile = "core.case.get.NoSuchFile" as const;
export const CaseGetExceptionNoSuchKey = "core.case.get.NoSuchKey" as const;
export const CaseGetExceptionMacro = "core.case.get.Macro" as const;
export const CaseGetExceptionUnreachable = "core.case.get.Unreachable" as const;

export type CaseGetExceptions =
  | Exception<typeof CaseGetExceptionNoSuchFile>
  | Exception<typeof CaseGetExceptionNoSuchKey>
  | Exception<typeof CaseGetExceptionMacro>
  | Exception<typeof CaseGetExceptionUnreachable>;

export const CaseSetExceptionMacro = "core.case.set.Macro" as const;
export const CaseSetExceptionUnreachable = "core.case.set.Unreachable" as const;

export type CaseSetExceptions =
  | Exception<typeof CaseSetExceptionMacro>
  | Exception<typeof CaseSetExceptionUnreachable>;

export function upsert<A>(as: A[], finder: (a: A) => boolean, factory: (a: A | undefined) => A): A[] {
  const index = as.findIndex(finder);
  if (index === -1) {
    return [...as, factory(undefined)]
  } else {
    return [...as.slice(0, index), factory(as[index]), ...as.slice(index + 1)]
  }
}

export const ArrayExceptionOutOfIndex = "core.case.set.OutOfIndex" as const;

export type ArrayExceptions =
  | Exception<typeof ArrayExceptionOutOfIndex>;

export function arrayGet<T>(xs: T[], i: number): Either<ArrayExceptions, T> {
  if (i < 0) {
    return left(fail(ArrayExceptionOutOfIndex, i))
  } else if (i < xs.length) {
    return right(xs[i])
  } else {
    return left(fail(ArrayExceptionOutOfIndex, i))
  }
}

export function arraySet<T>(xs: T[], i: number, x: T): Either<ArrayExceptions, T[]> {
  if (i < 0) {
    return left(fail(ArrayExceptionOutOfIndex, i))
  } else if (i <= xs.length) {
    return right([...xs.slice(i), x, ...xs.slice(i + 1)])
  } else {
    return left(fail(ArrayExceptionOutOfIndex, i))
  }
}

export function setOnNew(key: Key, value: CaseAnnotatedExpression.Type): Either<CaseSetExceptions, CaseExpression.Type> {
  const name = head(key);
  if (name === undefined) {
    return left(fail(CaseSetExceptionUnreachable, "key reached the end of search"))
  } else if (typeof name === "string") {
    return CaseDictionary.set(CaseDictionary.empty, key, value)
  } else {
    return CaseArray.set(CaseArray.empty, key, value)
  }
}

export const KeyFoamFile = "FoamFile" as const;

export function indent(x: string): string {
  return "    " + x.replace(/\n/g, "\n    ")
}