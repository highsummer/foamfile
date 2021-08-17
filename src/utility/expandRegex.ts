import {assertNever, bundle2, Exception, fail} from "../utils";
import {CaseAnnotatedExpression} from "../case/caseAnnotatedExpression";
import {all, Either, left, right} from "fp-chainer/lib/either";
import {CaseExpression} from "../case/caseExpression";
import {CaseLiteral} from "../case/caseLiteral";
import {CaseDeclaration} from "../case/caseDeclaration";
import {CaseRegexDeclaration} from "../case/caseRegexDeclaration";
import {CaseMacro} from "../case/caseMacro";
import {CaseDictionary} from "../case/caseDictionary";
import {CaseArray} from "../case/caseArray";
import {CaseNode} from "../case/caseNode";

export const ExceptionExpandRegexTooComplex = "core.case.expandMacro.TooComplex" as const;
export const ExceptionExpandRegexBadInput = "core.case.expandMacro.BadInput" as const;

export type Exceptions =
  | Exception<typeof ExceptionExpandRegexTooComplex>
  | Exception<typeof ExceptionExpandRegexBadInput>;


function expandCaseAnnotatedExpression(x: CaseAnnotatedExpression.Type | CaseMacro.Type): Either<Exceptions, CaseAnnotatedExpression.Type | CaseMacro.Type> {
  if (CaseMacro.is(x)) {
    return right(x)
  } else {
    return bundle2(expandCaseExpression(x.value), all(x.annotations.map(expandCaseLiteral)))
      .map(([value, annotations]) => ({
        ...x,
        value: value,
        annotations: annotations,
      }))
  }
}

function expandCaseExpression(x: CaseExpression.Type | CaseMacro.Type): Either<Exceptions, CaseExpression.Type | CaseMacro.Type> {
  if (CaseMacro.is(x)) {
    return right(x)
  } else if (CaseDictionary.is(x)) {
    return all(x.fields.map(expandCaseDeclaration))
      .map(fields => ({
        ...x,
        fields: fields.flat(),
      }))
  } else if (CaseArray.is(x)) {
    return all(x.fields.map(expandCaseAnnotatedExpression))
      .map(fields => ({
        ...x,
        fields: fields,
      }))
  } else if (CaseLiteral.is(x)) {
    return expandCaseLiteral(x)
  } else {
    return right(x)
  }
}

function expandCaseLiteral(x: CaseLiteral.Type | CaseMacro.Type): Either<Exceptions, CaseLiteral.Type | CaseMacro.Type> {
  return right(x)
}

function expandCaseDeclaration(x: CaseDeclaration.Type | CaseRegexDeclaration.Type | CaseMacro.Type): Either<Exceptions, (CaseDeclaration.Type | CaseMacro.Type)[]> {
  if (CaseMacro.is(x)) {
    return right([x])
  } else if (CaseDeclaration.is(x)) {
    return expandCaseAnnotatedExpression(x.value)
      .map(value => [{
        ...x,
        value: value,
      }])
  } else {
    const match = /^([\w\d_]*)(\(([\w\d_]+\|)+[\w\d_]+\))?([\w\d_]*)$/.exec(x.pattern)
    if (match !== null) {
      const [all, prefix, pattern, partial, suffix] = match;
      const elements = pattern.slice(1, -1).split("|");
      return right(elements.map(key => ({
        type: CaseDeclaration.TypeSignature,
        key: `${prefix}${key}${suffix}`,
        value: x.value,
      })))
    } else {
      return left(fail(ExceptionExpandRegexTooComplex, `'${x.pattern}' is too complex to expand`))
    }
  }
}

export function expand<Node extends CaseNode.Type>(x: Node): Either<Exceptions, Node> {
  if (CaseAnnotatedExpression.is(x)) {
    return expandCaseAnnotatedExpression(x) as Either<Exceptions, Node>
  } else if (CaseExpression.is(x)) {
    return expandCaseExpression(x) as Either<Exceptions, Node>
  } else if (CaseLiteral.is(x)) {
    return expandCaseLiteral(x) as Either<Exceptions, Node>
  } else if (CaseDeclaration.is(x) || CaseRegexDeclaration.is(x)) {
    return left(fail(ExceptionExpandRegexBadInput, `declaration cannot be directly expanded`))
  } else {
    return right(x)
  }
}
