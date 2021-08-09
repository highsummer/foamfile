import {parse} from "./parser";
import {CaseDictionary} from "./caseDictionary";
import {CaseDeclaration} from "./caseDeclaration";
import {expect} from "chai";
import assert = require("assert");
import {CaseExpression} from "./caseExpression";
import {CaseAnnotatedExpression} from "./caseAnnotatedExpression";
import {CaseLiteral} from "./caseLiteral";

describe("case", () => {
  const text1 = `a {
    b 1;
    c 2;
  }`;

  const parsed1 = parse(text1);

  const expectation1 = CaseDictionary.build(
    CaseDeclaration.build("a", CaseDictionary.build(
      CaseDeclaration.build("b", 1),
      CaseDeclaration.build("c", 2),
    )),
  );

  const text2 = `a {
    b 1;
    c 2;
  }
  
  d {
    e 3;
    f {
      g 4;
    }
  }`;

  const parsed2 = parse(text2);

  const expectation2 = CaseDictionary.build(
    CaseDeclaration.build("a", CaseDictionary.build(
      CaseDeclaration.build("b", 1),
      CaseDeclaration.build("c", 2),
    )),
    CaseDeclaration.build("d", CaseDictionary.build(
      CaseDeclaration.build("e", 3),
      CaseDeclaration.build("f", CaseDictionary.build(
        CaseDeclaration.build("g", 4),
      )),
    )),
  );

  it("parser test 1", () => {
    parsed1
      .map(d => expect(d).to.be.deep.equal(expectation1))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("parser test 2", () => {
    parsed2
      .map(d => expect(d).to.be.deep.equal(expectation2))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("getter test 1", () => {
    parsed1
      .chain(d => CaseExpression.get(d, ["a", "b"]))
      .map(x => expect(x).to.be.deep.equal(CaseAnnotatedExpression.to(1)))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("getter test 2", () => {
    parsed1
      .chain(d => CaseExpression.get(d, ["a"]))
      .map(x => expect(x).to.be.deep.equal(CaseAnnotatedExpression.build(CaseDictionary.build(
        CaseDeclaration.build("b", 1),
        CaseDeclaration.build("c", 2),
      ))))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("getter test 3", () => {
    parsed2
      .chain(d => CaseExpression.get(d, ["a", "b"]))
      .map(x => expect(x).to.be.deep.equal(CaseAnnotatedExpression.to(1)))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("getter test 4", () => {
    parsed2
      .chain(d => CaseExpression.get(d, ["a"]))
      .map(x => expect(x).to.be.deep.equal(CaseAnnotatedExpression.build(CaseDictionary.build(
        CaseDeclaration.build("b", 1),
        CaseDeclaration.build("c", 2),
      ))))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("getter test 5", () => {
    parsed2
      .chain(d => CaseExpression.get(d, ["d", "f", "g"]))
      .map(x => expect(x).to.be.deep.equal(CaseAnnotatedExpression.to(4)))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("setter test 1", () => {
    parsed1
      .chain(d => CaseExpression.set(d, ["a", "b"], CaseAnnotatedExpression.to(3)))
      .map(x => expect(x).to.be.deep.equal(CaseDictionary.build(
        CaseDeclaration.build("a", CaseDictionary.build(
          CaseDeclaration.build("b", 3),
          CaseDeclaration.build("c", 2),
        )),
      )))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("setter test 2", () => {
    parsed1
      .chain(d => CaseExpression.set(d, ["a"], CaseAnnotatedExpression.to(4)))
      .map(x => expect(x).to.be.deep.equal(CaseDictionary.build(
        CaseDeclaration.build("a", 4)
      )))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("setter test 3", () => {
    parsed1
      .chain(d => CaseExpression.set(d, ["c"], CaseAnnotatedExpression.to(4)))
      .map(x => expect(x).to.be.deep.equal(CaseDictionary.build(
        CaseDeclaration.build("a", CaseDictionary.build(
          CaseDeclaration.build("b", 1),
          CaseDeclaration.build("c", 2),
        )),
        CaseDeclaration.build("c", 4),
      )))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("setter test 4", () => {
    parsed1
      .chain(d => CaseExpression.set(d, ["a", "d"], CaseAnnotatedExpression.to(4)))
      .map(x => expect(x).to.be.deep.equal(CaseDictionary.build(
        CaseDeclaration.build("a", CaseDictionary.build(
          CaseDeclaration.build("b", 1),
          CaseDeclaration.build("c", 2),
          CaseDeclaration.build("d", 4),
        )),
      )))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("header test 1", () => {
    const original = `simulationType "RAS";
FoamFile {
    version  2;
    format   "ascii";
    class    "CaseDictionary.build";
    location "constant";
    object   "turbulenceProperties";
}
RAS {
    RASModel    "SpalartAllmaras";
    turbulence  "on";
    printCoeffs "on";
}`;

    const parsed = parse(original);
    parsed.mapLeft(l => assert.fail(JSON.stringify(l)));

    const rePrinted = CaseDictionary.printFile(parsed.orNull()!);
  });

  it("regex key", () => {
    const parsed = parse(regexedKey);
    parsed
      .mapLeft(l => assert.fail(JSON.stringify(l)))
      .map(r => {
        CaseExpression.get(r, ["rho", "solver"])
          .map(e => expect(e).to.be.deep.equal(CaseLiteral.to("diagonal")));
        CaseExpression.get(r, ["rhoWhatever", "solver"])
          .map(e => expect(e).to.be.deep.equal(CaseLiteral.to("diagonal")));
      });
  });

  it("nonuniform", () => {
    const parsed = parse(nonUniform);
    parsed.mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("macros", () => {
    const parsed = parse(nonUniform);
    parsed
      .mapLeft(l => assert.fail(JSON.stringify(l)))
      .map(_ => CaseDictionary.printFile(_));
  });
});

const regexedKey = `solvers
{
    "rho.*"
    {
        solver          diagonal;
    }

    "(U|e|k|epsilon)"
    {
        solver          PBiCGStab;
        preconditioner  DILU;
        tolerance       1e-5;
        relTol          0.1;
    }
}
`;

const nonUniform = `
internalField   nonuniform List<vector> 
4
(
(0.349762 28.5703 1.70084e-17)
(2.17481 30.845 -1.57762e-17)
(4.44457 33.03 0)
(7.03973 34.7047 -4.12643e-16)
);`;

const preprocessor = `
functions
{
    $a;
    a $a;
    #includeFunc mag(U)
}`;