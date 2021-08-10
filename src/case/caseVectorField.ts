import {predicate, Vector} from "./helpers";

export namespace CaseVectorField {
  export const TypeSignature = "case.vectorField" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    header: {
      version: string,
      format: string,
      className: "vectorField",
      object: string,
    },
    data: Vector[];
  }

  export function build(version: string, format: string, object: string, data: Vector[]): Type {
    return {
      type: TypeSignature,
      header: {
        version: version,
        format: format,
        className: "vectorField",
        object: object,
      },
      data: data,
    }
  }

//   export function print(x: Type): string {
//     return `/*--------------------------------*- C++ -*----------------------------------*\\
//   =========                 |
//   \\\\      /  F ield         | OpenFOAM: The Open Source CFD Toolbox
//    \\\\    /   O peration     | Website:  https://openfoam.org
//     \\\\  /    A nd           | Version:  7
//      \\\\/     M anipulation  |
// \\*---------------------------------------------------------------------------*/
//
// FoamFile {
//     version ${x.header.version};
//     format  ${x.header.format};
//     class   ${x.header.className};
//     object  ${x.header.object};
// }
//
// ${x.data.length}
// (
// ${x.data.map(v => `(${v.join(" ")})`).join("\n")}
// )
// `
//   }
}
