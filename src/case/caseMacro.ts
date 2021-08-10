import {FromGuard, predicate, Sum, unionPredicate} from "./helpers";
import {assertNever} from "../utils";

export namespace CaseMacroIdentifier {
  export const TypeSignature = "case.macro.identifier" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    name: string;
  }

  export function print(x: Type): string {
    return x.name
  }
}

export namespace CaseMacroQualifiedName {
  export const TypeSignature = "case.macro.qualifiedName" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    namespace: string;
    node: CaseMacro.Type;
  }

  export function print(x: Type): string {
    return `${x.namespace}.${CaseMacro.print(x.node)}`
  }
}

export namespace CaseMacroParentSearch {
  export const TypeSignature = "case.macro.parentSearch" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    node: CaseMacro.Type;
  }

  export function print(x: Type): string {
    if (CaseMacroParentSearch.is(x.node)) {
      return `.${CaseMacroParentSearch.print(x.node)}`
    } else {
      return `..${CaseMacro.print(x.node)}`
    }
  }
}

export namespace CaseMacroRootSearch {
  export const TypeSignature = "case.macro.rootSearch" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    node: CaseMacro.Type;
  }

  export function print(x: Type): string {
    return `:${CaseMacro.print(x)}`
  }
}

export namespace CaseMacroPreprocessor {
  export const TypeSignature = "case.macro.preprocessor" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    directive: string;
    arguments: string[];
  }

  export function print(x: Type): string {
    return `#${x.directive} ${x.arguments.join(" ")}`
  }
}

export namespace CaseMacro {
  export const guards = [
    () => CaseMacroIdentifier.is,
    () => CaseMacroQualifiedName.is,
    () => CaseMacroParentSearch.is,
    () => CaseMacroRootSearch.is,
    () => CaseMacroPreprocessor.is,
  ] as const;
  export type Enum = FromGuard<typeof guards>;
  export type Type = Sum<Enum>;
  export const is = unionPredicate(...guards)<Type>();

  export function print(x: Type): string {
    if (CaseMacroIdentifier.is(x)) {
      return CaseMacroIdentifier.print(x)
    } else if (CaseMacroQualifiedName.is(x)) {
      return CaseMacroQualifiedName.print(x)
    } else if (CaseMacroParentSearch.is(x)) {
      return CaseMacroParentSearch.print(x)
    } else if (CaseMacroRootSearch.is(x)) {
      return CaseMacroRootSearch.print(x)
    } else if (CaseMacroPreprocessor.is(x)) {
      return CaseMacroPreprocessor.print(x)
    } else {
      assertNever(x);
    }
  }
}
