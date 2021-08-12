import {CaseNode} from "../case/caseNode";
import {CaseAnnotatedExpression} from "../case/caseAnnotatedExpression";
import {all, Either, left, right} from "fp-chainer/lib/either";
import {assertNever, bundle2, Exception, fail} from "../utils";
import {CaseDictionary} from "../case/caseDictionary";
import {CaseArray} from "../case/caseArray";
import {CaseDeclaration} from "../case/caseDeclaration";
import {CaseRegexDeclaration} from "../case/caseRegexDeclaration";
import {CaseLiteral} from "../case/caseLiteral";
import {
  CaseMacro,
  CaseMacroIdentifier,
  CaseMacroParentSearch, CaseMacroPreprocessor,
  CaseMacroQualifiedName,
  CaseMacroRootSearch
} from "../case/caseMacro";
import {CaseExpression} from "../case/caseExpression";
import {CaseGetExceptionNoSuchKey} from "../case";

export const ExceptionExpandMacroNoEntry = "core.case.expandMacro.NoEntry" as const;
export const ExceptionExpandMacroInvalidTarget = "core.case.expandMacro.InvalidTarget" as const;
export const ExceptionExpandMacroNotImplemented = "core.case.expandMacro.NotImplemented" as const;

export type Exceptions =
  | Exception<typeof ExceptionExpandMacroNoEntry>
  | Exception<typeof ExceptionExpandMacroInvalidTarget>
  | Exception<typeof ExceptionExpandMacroNotImplemented>;

function expandCaseAnnotatedExpression(stack: CaseAnnotatedExpression.Type[], x: CaseAnnotatedExpression.Type): Either<Exceptions, CaseAnnotatedExpression.Type> {
  return bundle2(
    CaseMacro.is(x.value) ?
      expandCaseMacro([...stack, x], x.value)
        .chain(_ => CaseMacro.is(_.value) ?
          left(fail(ExceptionExpandMacroNotImplemented, `multi level macro is not implemented: '${_.type}'`)) :
          right(_.value)
        ) :
      expandCaseExpression([...stack, x], x.value),
    all(x.annotations.map(_ =>
      CaseMacro.is(_) ?
        expandCaseMacro([...stack, x], _)
          .chain(_ => CaseLiteral.is(_.value) ?
            right(_.value) :
            left(fail(ExceptionExpandMacroInvalidTarget, `non-literal found in annotatinos: '${_.type}'`))
          ) :
        expandCaseLiteral([...stack, x], _)
    )),
  )
    .map(([value, annotations]) => ({
      ...x,
      value: value,
      annotations: annotations,
    }))
}

function expandCaseExpression(stack: CaseAnnotatedExpression.Type[], x: CaseExpression.Type): Either<Exceptions, CaseExpression.Type> {
  if (CaseDictionary.is(x)) {
    return all(x.fields.map(_ =>
      CaseMacro.is(_) ?
        expandCaseMacro(stack, _)
          .chain(_ => CaseDictionary.is(_.value) ?
            right(_.value.fields) :
            left(fail(ExceptionExpandMacroInvalidTarget, `non-dictionary found in dictionary entry expansion: '${_.type}'`))
          ) :
        expandCaseDeclaration(stack, _).map(_ => [_])
    ))
      .map(fields => ({
        ...x,
        fields: fields.flat(),
      }))
  } else if (CaseArray.is(x)) {
    return all(x.fields.map(_ =>
      CaseMacro.is(_) ?
        expandCaseMacro(stack, _)
          .chain(_ => CaseArray.is(_.value) ?
            right(_.value.fields) :
            left(fail(ExceptionExpandMacroInvalidTarget, `non-array found in array entry expansion: '${_.type}'`))
          ) :
        expandCaseAnnotatedExpression(stack, _).map(_ => [_])
    ))
      .map(fields => ({
        ...x,
        fields: fields.flat(),
      }))
  } else {
    return right(x)
  }
}

function expandCaseLiteral(stack: CaseAnnotatedExpression.Type[], x: CaseLiteral.Type): Either<Exceptions, CaseLiteral.Type> {
  return right(x)
}

function expandCaseDeclaration(stack: CaseAnnotatedExpression.Type[], x: CaseDeclaration.Type | CaseRegexDeclaration.Type): Either<Exceptions, CaseDeclaration.Type | CaseRegexDeclaration.Type> {
  return CaseMacro.is(x.value) ?
    expandCaseMacro(stack, x.value)
      .chain(_ => CaseMacro.is(_) ?
        left(fail(ExceptionExpandMacroNotImplemented, `multi level macro is not implemented`)) :
        right({
          ...x,
          value: _,
        })
      ) :
    expandCaseAnnotatedExpression(stack, x.value)
      .map(value => ({
        ...x,
        value: value,
      }))
}

function expandCaseMacro(stack: CaseAnnotatedExpression.Type[], x: CaseMacro.Type): Either<Exceptions, CaseAnnotatedExpression.Type> {
  if (CaseMacroRootSearch.is(x)) {
    return expandCaseMacro([stack[0]], x.node)
  } else if (CaseMacroParentSearch.is(x)) {
    return expandCaseMacro(stack.slice(0, -1), x.node)
  } else if (CaseMacroQualifiedName.is(x)) {
    const tail = stack.slice(-1)[0];
    if (CaseDictionary.is(tail.value)) {
      return CaseExpression.get(tail.value, [x.namespace])
        .chain(anno => expandCaseMacro([...stack, anno], x.node))
        .chainLeft(e => stack.length > 1 ? expandCaseMacro(stack.slice(0, -1), x) : left(e))
        .mapLeft(e => fail(ExceptionExpandMacroNoEntry, `${e.code}: ${e.message}`))
    } else if (CaseArray.is(tail.value)) {
      return CaseExpression.get(tail.value, [parseInt(x.namespace)])
        .mapLeft(e => fail(ExceptionExpandMacroNoEntry, `${e.code}: ${e.message}`))
        .chain(anno => expandCaseMacro([...stack, anno], x.node))
    } else {
      return left(fail(ExceptionExpandMacroInvalidTarget, `invalid macro target type: '${tail.value.type}'`))
    }
  } else if (CaseMacroIdentifier.is(x)) {
    const tail = stack.slice(-1)[0];
    if (CaseDictionary.is(tail.value)) {
      return CaseExpression.get(tail.value, [x.name])
        .chainLeft(e =>
          e.code === CaseGetExceptionNoSuchKey && stack.length > 1 ?
            expandCaseMacro(stack.slice(0, -1), x) :
            left(fail(ExceptionExpandMacroNoEntry, `${e.code}: ${e.message}`))
        )
        .mapLeft(e => fail(ExceptionExpandMacroNoEntry, `${e.code}: ${e.message}`))
    } else if (CaseArray.is(tail.value)) {
      return CaseExpression.get(tail.value, [parseInt(x.name)])
        .mapLeft(e => fail(ExceptionExpandMacroNoEntry, `${e.code}: ${e.message}`))
    } else {
      return left(fail(ExceptionExpandMacroInvalidTarget, `invalid macro target type: '${tail.value.type}'`))
    }
  } else if (CaseMacroPreprocessor.is(x)) {
    return left(fail(ExceptionExpandMacroNotImplemented, `not implemented'`))
  } else {
    assertNever(x);
  }
}

export function expand<Node extends CaseNode.Type>(x: Node): Either<Exceptions, Node> {
  if (CaseAnnotatedExpression.is(x)) {
    return expandCaseAnnotatedExpression([x], x) as Either<Exceptions, Node>
  } else if (CaseExpression.is(x)) {
    return expandCaseExpression([CaseAnnotatedExpression.build(x)], x) as Either<Exceptions, Node>
  } else if (CaseLiteral.is(x)) {
    return expandCaseLiteral([CaseAnnotatedExpression.build(x)], x) as Either<Exceptions, Node>
  } else if (CaseDeclaration.is(x) || CaseRegexDeclaration.is(x)) {
    return expandCaseDeclaration([], x) as Either<Exceptions, Node>
  } else if (CaseMacro.is(x)) {
    return expandCaseMacro([], x) as Either<Exceptions, Node>
  } else {
    assertNever(x);
  }
}
