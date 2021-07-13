import {Case, getFromExpression} from "./index";
import {Dictionary} from "../utils";
import {
  CaseAnnotatedExpression,
  CaseArray,
  CaseDictionary, CaseDictionaryTypeSignature,
  CaseExpression,
  CaseLiteral,
  CaseStringLiteralTypeSignature,
  CaseStruct
} from "./types";
import {
  isCaseArray,
  isCaseBooleanLiteral,
  isCaseDictionary, isCaseDimensionLiteral,
  isCaseLiteral,
  isCaseNumericLiteral,
  isCaseStringLiteral,
  isCaseStruct
} from "./guard";
import {assertNever} from "../utils";

function indent(x: string): string {
  return "    " + x.replace(/\n/g, "\n    ")
}

export const KeyFoamFile = "FoamFile" as const;

export function printCase(x: Case): [string, string][] {
  return Dictionary.entries(x.fields)
    .map(([key, value]) => [key, printFile(value)])
}

export function printFile(x: CaseDictionary): string {
  const className = getFromExpression(x, [KeyFoamFile, "class"])
    .map(x => x.value.type === CaseStringLiteralTypeSignature ? x.value.data : "dictionary")
    .orElse(() => "dictionary")

  const header = {
    type: CaseDictionaryTypeSignature,
    fields: Dictionary.fromEntries(Dictionary.entries(x.fields).filter(([key, value]) => key === KeyFoamFile))
  };
  const others = {
    type: CaseDictionaryTypeSignature,
    fields: Dictionary.fromEntries(Dictionary.entries(x.fields).filter(([key, value]) => key !== KeyFoamFile))
  };

  function printOther() {
    if (className === "dictionary") {
      return printDictionaryInner(others)
    } else if (className === "polyBoundaryMesh") {
      return printArrayLikeFile(others)
    } else {
      console.warn(`unknown class '${className}' detected`);
      // FIXME: must be an error
      return printDictionaryInner(others)
    }
  }

  const headerComment = `/*--------------------------------*- C++ -*----------------------------------*\\
  =========                 |
  \\\\      /  F ield         | OpenFOAM: The Open Source CFD Toolbox
   \\\\    /   O peration     | Website:  https://openfoam.org
    \\\\  /    A nd           | Version:  7
     \\\\/     M anipulation  |
\\*---------------------------------------------------------------------------*/`;

  return `${headerComment}\n\n${printDictionaryInner(header)}\n\n${printOther()}`
}

export function printAnnotatedExpression(x: CaseAnnotatedExpression, columnWidths?: number[]): string {
  return `${[...x.annotations.map((l, i) => printLiteral(l).padEnd(columnWidths?.[i] ?? 0)), printExpression(x.value)].join(" ")}`
}

export function printExpression(x: CaseExpression): string {
  if (isCaseStruct(x)) {
    return printStruct(x)
  } else if (isCaseLiteral(x)) {
    return printLiteral(x)
  } else {
    assertNever(x);
  }
}

export function printStruct(x: CaseStruct): string {
  if (isCaseDictionary(x)) {
    return printDictionary(x)
  } else if (isCaseArray(x)) {
    return printArray(x)
  } else {
    assertNever(x);
  }
}

export function printLiteral(x: CaseLiteral): string {
  if (isCaseStringLiteral(x)) {
    return `"${x.data}"`
  } else if (isCaseNumericLiteral(x)) {
    const value = typeof x.data === "number" ? x.data.toString() : `(${x.data.map(String).join(" ")})`;
    const dimension = x.dimension !== undefined ? `[${x.dimension.map(String).join(" ")}] ` : "";
    return `${dimension}${value}`
  } else if (isCaseBooleanLiteral(x)) {
    return x.data ? "true" : "false"
  } else if (isCaseDimensionLiteral(x)) {
    return `[${x.data.map(e => `${e}`).join(" ")}]`
  } else {
    assertNever(x);
  }
}

export function printDictionaryInner(x: CaseDictionary): string {
  const literals = Dictionary.entries(x.fields).filter(([_, value]) => isCaseLiteral(value.value));
  const others = Dictionary.entries(x.fields).filter(([_, value]) => !isCaseLiteral(value.value));

  const textLiterals = literals.map(([key, value]) => ([key, ...value.annotations.map(printLiteral), printExpression(value.value)]));
  const maxColumn = Math.max(...textLiterals.map(row => row.length), 0);
  const margins = new Array(maxColumn)
    .fill(0)
    .map((_, i) => textLiterals.map(x => x[i] ?? ""))
    .map(column => column.map(x => x.length))
    .map(column => Math.max(...column));
  const printedLiterals = literals
    .map(([key, value]) => `${key.padEnd(margins[0])} ${printAnnotatedExpression(value, margins.slice(1))};`)
    .join("\n");

  const printedOthers = others
    .map(([key, value]) => `${key} ${printAnnotatedExpression(value)}`)
    .join("\n");

  return `${printedLiterals}${printedLiterals !== "" && printedOthers !== "" ? "\n" : ""}${printedOthers}`
}

export function printDictionary(x: CaseDictionary): string {
  return `{\n${indent(printDictionaryInner(x))}\n}`
}

export function printArray(x: CaseArray): string {
  return `(${x.fields.map(value => `${[...value.annotations.map(printLiteral), printExpression(value.value)].join(" ")}`).join(" ")})`
}

export function printArrayLikeFile(x: CaseDictionary): string {
  const header = getFromExpression(x, [KeyFoamFile]);
  const others = Dictionary.entries(x.fields).filter(([key, value]) => key !== KeyFoamFile);

  const printedHeader = header
    .map(printAnnotatedExpression)
    .map(line => `${KeyFoamFile} ${line}`)
    .orElse(() => "");

  const printedInnerBody = others
    .map(([key, value]) => `${key} ${printAnnotatedExpression(value)}`)
    .join("\n");

  const printedBody = `${others.length} (\n${indent(printedInnerBody)}\n)`;

  return `${printedHeader}${printedHeader !== "" ? "\n\n" : ""}${printedBody}`
}