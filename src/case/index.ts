import {
  CaseAnnotatedExpression,
  CaseArray,
  CaseArrayTypeSignature,
  CaseDictionary,
  CaseDictionaryTypeSignature,
  CaseDirectory,
  CaseExpression,
} from "./types";
import {Dictionary, Exception, fail} from "../utils";
import {isCaseArray, isCaseDictionary} from "./guard";
import {Either, left, right} from "fp-chainer/lib/either";

export {CaseDirectory as Case} from "./types";

const KeySeparator = ".";
type Key = Token[];
type Token = number | string;

function representKey(key: Key): string {
  return key
    .map(name => name.toString())
    .join(KeySeparator)
}

function head(key: Key): Token {
  return key[0]
}

function tail(key: Key): Key {
  return key.slice(1)
}

function isThis(key: Key): boolean {
  return key.length === 0
}

export const CaseGetExceptionNoSuchFile = "core.case.get.NoSuchFile" as const;
export const CaseGetExceptionNoSuchKey = "core.case.get.NoSuchKey" as const;
export const CaseGetExceptionUnreachable = "core.case.get.Unreachable" as const;

export type CaseGetExceptions =
  | Exception<typeof CaseGetExceptionNoSuchFile>
  | Exception<typeof CaseGetExceptionNoSuchKey>
  | Exception<typeof CaseGetExceptionUnreachable>;

export function getFromDirectory(dir: CaseDirectory, path: string, key: Key): Either<CaseGetExceptions, CaseAnnotatedExpression> {
  return Dictionary.get(dir.fields, path)
    .mapLeft(() => fail(CaseGetExceptionNoSuchFile, `no such file '${path}'`))
    .chain(expr => getFromExpression(expr, key))
}

export function getFromAnnotatedExpression(anno: CaseAnnotatedExpression, key: Key): Either<CaseGetExceptions, CaseAnnotatedExpression> {
  if (isThis(key)) {
    return right(anno)
  } else {
    return getFromExpression(anno.value, key)
  }
}

export function getFromExpression(expr: CaseExpression, key: Key): Either<CaseGetExceptions, CaseAnnotatedExpression> {
  if (isThis(key)) {
    return left(fail(CaseGetExceptionUnreachable, { expr: expr, key: key }))
  } else {
    if (isCaseDictionary(expr)) {
      return Dictionary.get(expr.fields, head(key))
        .mapLeft(() => fail(CaseGetExceptionNoSuchKey, `no such key '${representKey(key)}'`))
        .chain(data => getFromAnnotatedExpression(data, tail(key)))
    } else if (isCaseArray(expr)) {
      const name = head(key);
      const e: Either<CaseGetExceptions, CaseAnnotatedExpression> = typeof name === "number" ?
        (expr.fields[name] !== undefined ? right(expr.fields[name]) : left(fail(CaseGetExceptionNoSuchKey, `index out of range`))) :
        left(fail(CaseGetExceptionNoSuchKey, `cannot index array with string`));
      return e.chain(data => getFromAnnotatedExpression(data, tail(key)))
    } else {
      return left(fail(CaseGetExceptionNoSuchKey, `expression reached terminal but key is '${representKey(key)}'`))
    }
  }
}

export const EmptyCaseDictionary: CaseDictionary = {
  type: CaseDictionaryTypeSignature,
  fields: Dictionary.empty,
}

export const EmptyCaseArray: CaseArray = {
  type: CaseArrayTypeSignature,
  fields: [],
}

export const CaseSetExceptionUnreachable = "core.case.set.Unreachable" as const;

export type CaseSetExceptions =
  | Exception<typeof CaseSetExceptionUnreachable>;

export function setOnDirectory(dir: CaseDirectory, path: string, key: Key, value: CaseAnnotatedExpression): Either<CaseSetExceptions, CaseDirectory> {
  return Dictionary.get(dir.fields, path)
    .chainLeft(() => right(EmptyCaseDictionary))
    .chain(dict => setOnExpression(dict, key, value))
    .chain(dict => isCaseDictionary(dict) ? right(dict) : left(fail(CaseSetExceptionUnreachable, `unreachable statement with expression: ${JSON.stringify(dict)}`)))
    .map(dict => ({
      ...dir,
      fields: Dictionary.set(dir.fields, path, dict),
    }))
}

export function setOnAnnotatedExpression(anno: CaseAnnotatedExpression, key: Key, value: CaseAnnotatedExpression): Either<CaseSetExceptions, CaseAnnotatedExpression> {
  if (isThis(key)) {
    return right(value)
  } else {
    return setOnExpression(anno.value, key, value)
      .map(value => ({
        ...anno,
        value: value,
      }))
  }
}

export function setOnExpression(expr: CaseExpression, key: Key, value: CaseAnnotatedExpression): Either<CaseSetExceptions, CaseExpression> {
  if (isThis(key)) {
    return left(fail(CaseSetExceptionUnreachable, { expr: expr, key: key }))
  } else {
    if (isCaseDictionary(expr)) {
      return setOnDictionary(expr, key, value)
    } else if (isCaseArray(expr)) {
      return setOnArray(expr, key, value)
    } else {
      return setOnNew(key, value)
    }
  }
}

export function setOnDictionary(expr: CaseDictionary, key: Key, value: CaseAnnotatedExpression): Either<CaseSetExceptions, CaseExpression> {
  const name = head(key);
  if (typeof name === "string") {
    return Dictionary.get(expr.fields, name)
      .chainLeft(() => right(value))
      .chain(old => setOnAnnotatedExpression(old, tail(key), value))
      .map(updated => ({
        ...expr,
        fields: Dictionary.set(expr.fields, name, updated),
      }))
  } else {
    return setOnNew(key, value)
  }
}

export const ArrayExceptionOutOfIndex = "core.case.set.OutOfIndex" as const;

export type ArrayExceptions =
  | Exception<typeof ArrayExceptionOutOfIndex>;

function arrayGet<T>(xs: T[], i: number): Either<ArrayExceptions, T> {
  if (i < 0) {
    return left(fail(ArrayExceptionOutOfIndex, i))
  } else if (i < xs.length) {
    return right(xs[i])
  } else {
    return left(fail(ArrayExceptionOutOfIndex, i))
  }
}

function arraySet<T>(xs: T[], i: number, x: T): Either<ArrayExceptions, T[]> {
  if (i < 0) {
    return left(fail(ArrayExceptionOutOfIndex, i))
  } else if (i <= xs.length) {
    return right([...xs.slice(i), x, ...xs.slice(i + 1)])
  } else {
    return left(fail(ArrayExceptionOutOfIndex, i))
  }
}

export function setOnArray(expr: CaseArray, key: Key, value: CaseAnnotatedExpression): Either<CaseSetExceptions, CaseExpression> {
  const name = head(key);
  if (typeof name === "number") {
    return arrayGet(expr.fields, name)
      .chainLeft(() => right(value))
      .chain(old => setOnAnnotatedExpression(old, tail(key), value))
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

export function setOnNew(key: Key, value: CaseAnnotatedExpression): Either<CaseSetExceptions, CaseExpression> {
  const name = head(key);
  if (typeof name === "string") {
    return setOnDictionary(EmptyCaseDictionary, key, value)
  } else {
    return setOnArray(EmptyCaseArray, key, value)
  }
}