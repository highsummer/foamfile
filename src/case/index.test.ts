import {assert, expect} from "chai";
import {annotated, dictionary, entry, toCaseAnnotatedExpression, toCaseLiteral} from "./constructor";
import {getFromExpression, setOnExpression} from "./index";
import {parse} from "./parser";
import {printFile} from "./printer";
import {CaseDictionary} from "./types";

describe("case", () => {
  const text = `a {
    b 1;
    c 2;
  }`;

  const parsed = parse(text);

  const expectation = dictionary(
    entry("a", dictionary(
      entry("b", 1),
      entry("c", 2),
    )),
  );

  it("parser test 1", () => {
    parse(`a 1;`)
      .map(d => expect(d).to.be.deep.equal(dictionary(entry("a", 1))))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("parser test 2", () => {
    parsed
      .map(d => expect(d).to.be.deep.equal(expectation))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("getter test 1", () => {
    parsed
      .chain(d => getFromExpression(d, ["a", "b"]))
      .map(x => expect(x).to.be.deep.equal(toCaseAnnotatedExpression(1)))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("getter test 2", () => {
    parsed
      .chain(d => getFromExpression(d, ["a"]))
      .map(x => expect(x).to.be.deep.equal(annotated(dictionary(
        entry("b", 1),
        entry("c", 2),
      ))))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("setter test 1", () => {
    parsed
      .chain(d => setOnExpression(d, ["a", "b"], toCaseAnnotatedExpression(3)))
      .map(x => expect(x).to.be.deep.equal(dictionary(
        entry("a", dictionary(
          entry("b", 3),
          entry("c", 2),
        )),
      )))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("setter test 2", () => {
    parsed
      .chain(d => setOnExpression(d, ["a"], toCaseAnnotatedExpression(4)))
      .map(x => expect(x).to.be.deep.equal(dictionary(
        entry("a", 4)
      )))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("setter test 3", () => {
    parsed
      .chain(d => setOnExpression(d, ["c"], toCaseAnnotatedExpression(4)))
      .map(x => expect(x).to.be.deep.equal(dictionary(
        entry("a", dictionary(
          entry("b", 1),
          entry("c", 2),
        )),
        entry("c", 4),
      )))
      .mapLeft(l => assert.fail(JSON.stringify(l)));
  });

  it("header test 1", () => {
    const original = `simulationType "RAS";
FoamFile {
    version  2;
    format   "ascii";
    class    "dictionary";
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

    const rePrinted = printFile(parsed.orNull()!);
  });

  it("regex key", () => {
    const parsed = parse(regexedKey);
    parsed
      .mapLeft(l => assert.fail(JSON.stringify(l)))
      .map(r => {
        getFromExpression(r, ["rho", "solver"])
          .map(e => expect(e).to.be.deep.equal(toCaseLiteral("diagonal")));
        getFromExpression(r, ["rhoWhatever", "solver"])
          .map(e => expect(e).to.be.deep.equal(toCaseLiteral("diagonal")));
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
      .map(_ => printFile(_));
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