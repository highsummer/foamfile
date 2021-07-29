import {
  CaseAnnotatedExpression,
  CaseArray,
  CaseArrayTypeSignature, CaseDeclarationTypeSignature,
  CaseDictionary,
  CaseDictionaryTypeSignature,
  CaseDirectory,
  CaseExpression, CaseMacro, CaseMacroParentSearchTypeSignature, CaseNode,
} from "./types";
import {assertNever, Dictionary, Exception, fail} from "../utils";
import {
  isCaseArray, isCaseDeclaration,
  isCaseDictionary, isCaseMacro,
  isCaseMacroIdentifier,
  isCaseMacroParentSearch,
  isCaseMacroQualifiedName, isCaseMacroRootSearch, isCaseRegexDeclaration,
} from "./guard";
import {Either, left, right} from "fp-chainer/lib/either";
import {fromNullable} from "fp-chainer/lib/option";
import {toCaseAnnotatedExpression} from "./constructor";

export {CaseDirectory as Case} from "./types";

const KeySeparator = ".";
type Key = Token[];
type Token = number | string;

function representKey(key: Key): string {
  return key
    .map(name => name.toString())
    .join(KeySeparator)
}

function head(key: Key): Token | undefined {
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
export const CaseGetExceptionMacro = "core.case.get.Macro" as const;
export const CaseGetExceptionUnreachable = "core.case.get.Unreachable" as const;

export type CaseGetExceptions =
  | Exception<typeof CaseGetExceptionNoSuchFile>
  | Exception<typeof CaseGetExceptionNoSuchKey>
  | Exception<typeof CaseGetExceptionMacro>
  | Exception<typeof CaseGetExceptionUnreachable>;

export function getFromDirectory(dir: CaseDirectory, path: string, key: Key): Either<CaseGetExceptions, CaseAnnotatedExpression> {
  return Dictionary.get(dir.fields, path)
    .mapLeft(() => fail(CaseGetExceptionNoSuchFile, `no such file '${path}'`))
    .chain(expr => getFromExpression(expr, key))
}

export function getFromAnnotatedExpression(anno: CaseAnnotatedExpression, key: Key): Either<CaseGetExceptions, CaseAnnotatedExpression> {
  if (isThis(key)) {
    return right(anno)
  } else if (isCaseMacro(anno.value)) {
    return left(fail(CaseGetExceptionMacro, "unexpanded macro found"))
  } else {
    return getFromExpression(anno.value, key)
  }
}

function matchDeclaration(entry: CaseDictionary["fields"][number], key: string) {
  if (isCaseMacro(entry)) {
    return false
  } else if (isCaseRegexDeclaration(entry)) {
    return new RegExp(entry.pattern).exec(key) !== null
  } else if (isCaseDeclaration(entry)) {
    return entry.key === key
  } else {
    assertNever(entry);
  }
}

export function getFromExpression(expr: CaseExpression, key: Key): Either<CaseGetExceptions, CaseAnnotatedExpression> {
  if (isThis(key)) {
    return left(fail(CaseGetExceptionUnreachable, { expr: expr, key: key }))
  } else {
    if (isCaseMacro(expr)) {
      return left(fail(CaseGetExceptionMacro, "unexpanded macro found"))
    } else if (isCaseDictionary(expr)) {
      const name = head(key);
      if (name === undefined) {
        return left(fail(CaseGetExceptionNoSuchKey, "key reached the end of search"))
      } else {
        return fromNullable(expr.fields.find(entry => matchDeclaration(entry, name.toString())))
          .mapLeft(() => fail(CaseGetExceptionNoSuchKey, `no such key '${representKey(key)}'`))
          .chain(data => isCaseMacro(data) ? left(fail(CaseGetExceptionMacro, "unexpanded macro found")) : right(data))
          .chain(({ value }) => isCaseMacro(value) ? left(fail(CaseGetExceptionMacro, "unexpanded macro found")) : getFromAnnotatedExpression(value, tail(key)))
      }
    } else if (isCaseArray(expr)) {
      const name = head(key);
      const e: Either<CaseGetExceptions, CaseAnnotatedExpression | CaseMacro> = typeof name === "number" ?
        (expr.fields[name] !== undefined ? right(expr.fields[name]) : left(fail(CaseGetExceptionNoSuchKey, `index out of range`))) :
        left(fail(CaseGetExceptionNoSuchKey, `cannot index array with string`));
      return e
        .chain(data => isCaseMacro(data) ? left(fail(CaseGetExceptionMacro, "unexpanded macro found")) : right(data))
        .chain(data => getFromAnnotatedExpression(data, tail(key)))
    } else {
      return left(fail(CaseGetExceptionNoSuchKey, `expression reached terminal but key is '${representKey(key)}'`))
    }
  }
}

export const EmptyCaseDictionary: CaseDictionary = {
  type: CaseDictionaryTypeSignature,
  fields: [],
}

export const EmptyCaseArray: CaseArray = {
  type: CaseArrayTypeSignature,
  fields: [],
}

export const CaseSetExceptionMacro = "core.case.set.Macro" as const;
export const CaseSetExceptionUnreachable = "core.case.set.Unreachable" as const;

export type CaseSetExceptions =
  | Exception<typeof CaseSetExceptionMacro>
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
  } else if (isCaseMacro(anno.value)) {
    return left(fail(CaseSetExceptionMacro, "unexpanded macro found"))
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

function upsert<A>(as: A[], finder: (a: A) => boolean, factory: (a: A | undefined) => A): A[] {
  const index = as.findIndex(finder);
  if (index === -1) {
    return [...as, factory(undefined)]
  } else {
    return [...as.slice(0, index), factory(as[index]), ...as.slice(index + 1)]
  }
}

export function setOnDictionary(expr: CaseDictionary, key: Key, value: CaseAnnotatedExpression): Either<CaseSetExceptions, CaseExpression> {
  const name = head(key);
  if (name === undefined) {
    return left(fail(CaseSetExceptionUnreachable, "key reached the end of search"))
  } else if (typeof name === "string") {
    const original = expr.fields.find(entry => matchDeclaration(entry, name.toString()));
    if (original !== undefined) {
      return right(original)
        .chain(old => isCaseMacro(old) ? left(fail(CaseSetExceptionMacro, "unexpanded macro found")) : right(old))
        .chain(old => isCaseMacro(old.value) ? left(fail(CaseSetExceptionMacro, "unexpanded macro found")) : setOnAnnotatedExpression(old.value, tail(key), value))
        .map(newValue => ({
          ...expr,
          fields: upsert(
            expr.fields,
            entry => matchDeclaration(entry, name.toString()),
            () => ({ type: CaseDeclarationTypeSignature, key: name, value: newValue }),
          ),
        }))
    } else {
      if (isThis(tail(key))) {
        return right({
          ...expr,
          fields: [
            ...expr.fields,
            {
              type: CaseDeclarationTypeSignature,
              key: name,
              value: value,
            },
          ]
        })
      } else {
        return setOnNew(tail(key), value)
          .map(_ => ({ type: CaseDeclarationTypeSignature, key: name, value: toCaseAnnotatedExpression(_) }))
          .map(newEntry => ({
            ...expr,
            fields: [
              ...expr.fields,
              newEntry,
            ]
          }))
      }
    }
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
  if (name === undefined) {
    return left(fail(CaseSetExceptionUnreachable, "key reached the end of search"))
  } else if (typeof name === "number") {
    return arrayGet(expr.fields, name)
      .chainLeft(() => right(value))
      .chain(old => isCaseMacro(old) ? left(fail(CaseSetExceptionMacro, "unexpanded macro found")) : right(old))
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
  if (name === undefined) {
    return left(fail(CaseSetExceptionUnreachable, "key reached the end of search"))
  } else if (typeof name === "string") {
    return setOnDictionary(EmptyCaseDictionary, key, value)
  } else {
    return setOnArray(EmptyCaseArray, key, value)
  }
}