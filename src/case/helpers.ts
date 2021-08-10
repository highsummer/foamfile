export function predicate<Sig extends string>(signature: Sig) {
  return function<Type>() {
    return function(x: any): x is Type {
      return x.type === signature
    }
  }
}

export function unionPredicate(...predicates: (() => (x: any) => boolean)[]) {
  return function<Type>() {
    return (x: any): x is Type => !predicates.every(p => !p()(x))
  }
}

export type FromGuard<T> = T extends readonly [infer Head, ...infer Tail] ? (Head extends () => (x: any) => x is infer X ? [X, ...FromGuard<Tail>] : []) : [];

export type Sum<T> = T extends readonly [infer Head, ...infer Tail] ? Head | Sum<Tail> : never;

export type Vector = [number, number, number];
