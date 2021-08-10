import {CaseDictionary} from "./caseDictionary";
import {CaseDeclaration} from "./caseDeclaration";
import {expect} from "chai";
import assert = require("assert");
import {CaseExpression} from "./caseExpression";
import {CaseAnnotatedExpression} from "./caseAnnotatedExpression";
import {CaseLiteral} from "./caseLiteral";
import {Dictionary} from "../parse/dictionary";
import {VectorField} from "../parse/vectorField";
import {FaceList} from "../parse/faceList";
import {VolField} from "../parse/volField";

describe("case", () => {
  const text1 = `a {
    b 1;
    c 2;
  }`;

  const parsed1 = Dictionary.parse(text1);

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

  const parsed2 = Dictionary.parse(text2);

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

  it("Dictionary.parser test 1", () => {
    parsed1
      .map(d => expect(d).to.be.deep.equal(expectation1))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("Dictionary.parser test 2", () => {
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

    const parsed = Dictionary.parse(original);
    parsed.mapLeft(l => assert.fail(JSON.stringify(l)));

    const rePrinted = CaseDictionary.printFile(parsed.orNull()!);
  });

  it("regex key", () => {
    const parsed = Dictionary.parse(regexedKey);
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
    const parsed = Dictionary.parse(nonUniform);
    parsed.mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("macros", () => {
    const parsed = Dictionary.parse(nonUniform);
    parsed
      .mapLeft(l => assert.fail(JSON.stringify(l)))
      .map(_ => CaseDictionary.printFile(_));
  });

  it("vector field", () => {
    const parsed = VectorField.parse(vectorField);
    parsed
      .mapLeft(l => assert.fail(JSON.stringify(l)))
  });

  it("faceList", () => {
    const parsed = FaceList.parse(faceList);
    parsed
      .mapLeft(l => assert.fail(JSON.stringify(l)))
  });

  it("volField", () => {
    const parsed = VolField.parse(volField);
    parsed
      .mapLeft(l => assert.fail(JSON.stringify(l)))
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

const vectorField = `FoamFile
{
    version     2.0;
    format      ascii;
    class       vectorField;
    object      points;
}

4
(
(-17.5492 0.306481 0)
(-17.5472 0.397851 0)
(-17.5391 0.49775 0)
(-17.5189 0.60624 0)
)`

const faceList = `FoamFile
{
    version     2.0;
    format      ascii;
    class       faceList;
    object      faces;
}

4
(
4(156 0 78 235)
4(157 236 79 1)
4(156 235 236 157)
4(158 237 80 2)
)`;

const volField = `
dimensions      [0 2 -2 0 0 0 0];

internalField   nonuniform List<scalar> 
3
(
70.7896
9.90852
-62.7748
)
;


boundaryField
{
    inlet
    {
        type            freestreamPressure;
        freestreamValue uniform 0;
        supersonic      0;
        value           nonuniform List<scalar> 
3
(
1.2351
0.666308
0.0590405
)
;
    }
    walls
    {
        type            zeroGradient;
    }
    frontAndBack
    {
        type            empty;
    }
}`;