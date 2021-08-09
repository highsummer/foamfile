import {predicate} from "./helpers";
import {CaseDeclaration} from "./caseDeclaration";
import {CaseRegexDeclaration} from "./caseRegexDeclaration";
import {CaseMacro} from "./caseMacro";
import {Either, left, right} from "fp-chainer/lib/either";
import {fail} from "../utils";
import {
  CaseSetExceptionMacro,
  CaseSetExceptions,
  CaseSetExceptionUnreachable,
  head, indent,
  isThis,
  Key, KeyFoamFile,
  setOnNew,
  tail, upsert
} from "./index";
import {CaseAnnotatedExpression} from "./caseAnnotatedExpression";
import {CaseExpression} from "./caseExpression";
import {CaseLiteral, CaseStringLiteral} from "./caseLiteral";

export namespace CaseDictionary {
  export const TypeSignature = "case.dictionary" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    fields: (CaseDeclaration.Type | CaseRegexDeclaration.Type | CaseMacro.Type)[];
  }

  export function build(...entries: CaseDeclaration.Type[]): Type {
    return {
      type: TypeSignature,
      fields: entries,
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
    } else if (typeof name === "string") {
      const original = expr.fields.find(entry => CaseDeclaration.match(entry, name.toString()));
      if (original !== undefined) {
        return right(original)
          .chain(old => CaseMacro.is(old) ? left(fail(CaseSetExceptionMacro, "unexpanded macro found")) : right(old))
          .chain(old => CaseMacro.is(old.value) ? left(fail(CaseSetExceptionMacro, "unexpanded macro found")) : CaseAnnotatedExpression.set(old.value, tail(key), value))
          .map(newValue => ({
            ...expr,
            fields: upsert(
              expr.fields,
              entry => CaseDeclaration.match(entry, name.toString()),
              () => ({ type: CaseDeclaration.TypeSignature, key: name, value: newValue }),
            ),
          }))
      } else {
        if (isThis(tail(key))) {
          return right({
            ...expr,
            fields: [
              ...expr.fields,
              {
                type: CaseDeclaration.TypeSignature,
                key: name,
                value: value,
              },
            ]
          })
        } else {
          return setOnNew(tail(key), value)
            .map(_ => ({ type: CaseDeclaration.TypeSignature, key: name, value: CaseAnnotatedExpression.to(_) }))
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

  export function printFile(x: Type): string {
    const className = CaseExpression.get(x, [KeyFoamFile, "class"])
      .map(x => x.value.type === CaseStringLiteral.TypeSignature ? x.value.data : "dictionary")
      .orElse(() => "dictionary")

    const header = {
      type: TypeSignature,
      fields: x.fields.filter(entry => !CaseDeclaration.is(entry) || entry.key === KeyFoamFile)
    };
    const others = {
      type: TypeSignature,
      fields: x.fields.filter(entry => !CaseDeclaration.is(entry) || entry.key !== KeyFoamFile)
    };

    function printOther() {
      if (className === "dictionary") {
        return printInner(others)
      } else if (className === "polyBoundaryMesh") {
        return printArrayLikeFile(others)
      } else {
        console.warn(`unknown class '${className}' detected`);
        // FIXME: must be an error
        return printInner(others)
      }
    }

    const headerComment = `/*--------------------------------*- C++ -*----------------------------------*\\
  =========                 |
  \\\\      /  F ield         | OpenFOAM: The Open Source CFD Toolbox
   \\\\    /   O peration     | Website:  https://openfoam.org
    \\\\  /    A nd           | Version:  7
     \\\\/     M anipulation  |
\\*---------------------------------------------------------------------------*/`;

    return `${headerComment}\n\n${printInner(header)}\n\n${printOther()}`
  }

  export function printInnerClean(fields: [string, CaseAnnotatedExpression.Type][]): string {
    const literals = fields.filter(([_, value]) => CaseLiteral.is(value.value));
    const others = fields.filter(([_, value]) => !CaseLiteral.is(value.value));

    const textLiterals = literals.map(([key, value]) => ([key, ...value.annotations.map(CaseLiteral.print), CaseExpression.print(value.value as CaseExpression.Type)]));
    const maxColumn = Math.max(...textLiterals.map(row => row.length), 0);
    const margins = new Array(maxColumn)
      .fill(0)
      .map((_, i) => textLiterals.map(x => x[i] ?? ""))
      .map(column => column.map(x => x.length))
      .map(column => Math.max(...column));
    const printedLiterals = literals
      .map(([key, value]) => `${key.padEnd(margins[0])} ${CaseAnnotatedExpression.print(value, margins.slice(1))};`)
      .join("\n");

    const printedOthers = others
      .map(([key, value]) => `${key} ${CaseAnnotatedExpression.print(value)}`)
      .join("\n");

    return `${printedLiterals}${printedLiterals !== "" && printedOthers !== "" ? "\n" : ""}${printedOthers}`
  }
  
  export function printInner(x: Type): string {
    if (x.fields.every(entry => !CaseMacro.is(entry) && !CaseMacro.is(entry.value))) {
      return CaseDictionary.printInnerClean(x.fields
        .map(entry => entry as CaseDeclaration.Type)
        .map(({ key, value }) => [key, value] as [string, CaseAnnotatedExpression.Type])
      )
    } else {
      return x.fields
        .map(entry => {
          if (CaseMacro.is(entry)) {
            return CaseMacro.print(entry)
          } else {
            const keyText = CaseRegexDeclaration.is(entry) ? `"${entry.pattern}"` : entry.key;
            if (CaseMacro.is(entry.value)) {
              return `${keyText} ${CaseMacro.print(entry.value)};`
            } else if (CaseDictionary.is(entry.value.value)) {
              return `${keyText} ${CaseAnnotatedExpression.print(entry.value)}`
            } else {
              return `${keyText} ${CaseAnnotatedExpression.print(entry.value)};`
            }
          }
        })
        .join("\n")
    }
  }

  export function print(x: Type): string {
    return `{\n${indent(printInner(x))}\n}`
  }

  export function printArrayLikeFile(x: Type): string {
    const header = CaseExpression.get(x, [KeyFoamFile]);
    const others = x.fields.filter(entry => CaseDeclaration.is(entry) && entry.key !== KeyFoamFile);

    const printedHeader = header
      .map(CaseAnnotatedExpression.print)
      .map(line => `${KeyFoamFile} ${line}`)
      .orElse(() => "");

    const printedInnerBody = others
      .map(entry => {
        if (CaseMacro.is(entry)) {
          return CaseMacro.print(entry)
        } else {
          const keyText = CaseRegexDeclaration.is(entry) ? `"${entry.pattern}"` : entry.key;
          if (CaseMacro.is(entry.value)) {
            return `${keyText} ${CaseMacro.print(entry.value)}`
          } else {
            return `${keyText} ${CaseAnnotatedExpression.print(entry.value)}`
          }
        }
      })
      .join("\n");

    const printedBody = `${others.length} (\n${indent(printedInnerBody)}\n)`;

    return `${printedHeader}${printedHeader !== "" ? "\n\n" : ""}${printedBody}`
  }
}
