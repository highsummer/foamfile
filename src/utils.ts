import {Either, left, right} from "fp-chainer/either";

export function bundle2<EA, A, EB, B>(a: Either<EA, A>, b: Either<EB, B>): Either<EA | EB, [A, B]> {
  return a.chain(a => b.map(b => [a, b] as [A, B]))
}

export function bundle3<EA, A, EB, B, EC, C>(a: Either<EA, A>, b: Either<EB, B>, c: Either<EC, C>): Either<EA | EB | EC, [A, B, C]> {
  return a.chain(a => b.chain(b => c.map(c => [a, b, c] as [A, B, C])))
}

export function assertNever(x: never): never {
  throw new Error(`unreachable but x is ${JSON.stringify(x)}`)
}

export function must<A>(maybe: A | undefined): A {
  if (maybe === undefined) {
    throw new Error("must not be undefined")
  }
  return maybe
}
