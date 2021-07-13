import {assert, expect} from "chai";
import {annotated, dictionary, entry, toCaseAnnotatedExpression} from "./constructor";
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
    console.log(rePrinted);
  });
});