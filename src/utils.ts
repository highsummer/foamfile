import {Either, left, right} from "fp-chainer/lib/either";

export function bundle2<EA, A, EB, B>(a: Either<EA, A>, b: Either<EB, B>): Either<EA | EB, [A, B]> {
  return a.chain(a => b.map(b => [a, b] as [A, B]))
}

export function bundle3<EA, A, EB, B, EC, C>(a: Either<EA, A>, b: Either<EB, B>, c: Either<EC, C>): Either<EA | EB | EC, [A, B, C]> {
  return a.chain(a => b.chain(b => c.map(c => [a, b, c] as [A, B, C])))
}

export type Dictionary<K, V> = { [k: string]: V };

export namespace Dictionary {
  export type KeyType<T> = T extends Dictionary<infer K, infer V> ? K : never;
  export type ValueType<T> = T extends Dictionary<infer K, infer V> ? V : never;

  export const empty: Dictionary<never, never> = {};

  export function key(k: any): string {
    return JSON.stringify(k)
  }

  export function fromEntries<K, V>(entries: readonly (readonly [K, V])[]): Dictionary<K, V> {
    return Object.fromEntries(entries.map(([k, v]) => [Dictionary.key(k), v]))
  }

  export function get<K, V>(d: Dictionary<K, V>, k: K): Either<void, V> {
    return Dictionary.key(k) in d ? right(d[Dictionary.key(k)]) : left(undefined)
  }

  export function getOrElse<K, V>(d: Dictionary<K, V>, k: K, v: V): V {
    return Dictionary.key(k) in d ? d[Dictionary.key(k)] : v
  }

  export function getMust<K, V>(d: Dictionary<K, V>, k: K): V {
    if (!(Dictionary.key(k) in d)) {
      throw new Error(`no such key ${Dictionary.key(k)}`)
    } else {
      return d[Dictionary.key(k)]
    }
  }

  export function set<K, V>(d: Dictionary<K, V>, k: K, v: V): Dictionary<K, V> {
    return {...d, [Dictionary.key(k)]: v}
  }

  export function merge<K, V>(d: Dictionary<K, V>, other: Dictionary<K, V>): Dictionary<K, V> {
    return {...d, ...other}
  }

  export function mergeW<L, U, K, V>(d: Dictionary<K, V>, other: Dictionary<L, U>): Dictionary<K | L, V | U> {
    return {...d, ...other}
  }

  export function entries<K, V>(d: Dictionary<K, V>): [K, V][] {
    return Object.entries(d).map(([k, v]) => [JSON.parse(k), v] as [K, V])
  }

  export function keys<K, V>(d: Dictionary<K, V>): K[] {
    return Object.keys(this.internal).map(k => JSON.parse(k) as K)
  }

  export function mapValues<K, V, U>(d: Dictionary<K, V>, mapper: (k: K, v: V) => U): Dictionary<K, U> {
    return Object.fromEntries(
      Dictionary.entries(d)
        .map(([k, v]) => [Dictionary.key(k), mapper(k, v)])
    )
  }

  export function map<K, V, L, U>(d: Dictionary<K, V>, mapper: (k: K, v: V) => [L, U]): Dictionary<L, U> {
    return Object.fromEntries(
      Dictionary.entries(d)
        .map(([k, v]) => mapper(k, v))
        .map(([l, u]) => [Dictionary.key(l), u])
    )
  }

  export function filter<K, V>(d: Dictionary<K, V>, filterer: (k: K, v: V) => boolean): Dictionary<K, V> {
    return Object.fromEntries(
      Dictionary.entries(d)
        .filter(([k, v]) => filterer(k, v))
        .map(([l, u]) => [Dictionary.key(l), u])
    )
  }

  export function groupBy<K, V>(as: V[], grouper: (a: V) => K): Dictionary<K, V[]> {
    return as.reduce((acc, a) => {
      const key = grouper(a);
      return Dictionary.set(acc, key, [...Dictionary.getOrElse(acc, key, []), a])
    }, {})
  }
}

export function assertNever(x: never): never {
  throw new Error(`unreachable but x is ${JSON.stringify(x)}`)
}

export interface Exception<T extends string> {
  code: T;
  message: string;
  trace: string;
}

function errorToString(rawMessage: any): string {
  return typeof rawMessage === "string" ? rawMessage : "message" in rawMessage ? rawMessage.message : JSON.stringify(rawMessage)
}

export function fail<T extends string, E extends Exception<T>>(code: T, rawMessage: any, rawInternalLog?: any): Exception<T> {
  if (rawInternalLog !== undefined) {
    console.warn(rawInternalLog);
  }

  return {
    code: code,
    message: errorToString(rawMessage),
    trace: must((new Error()).stack),
  }
}

export function must<A>(maybe: A | undefined): A {
  if (maybe === undefined) {
    throw new Error("must not be undefined")
  }
  return maybe
}
