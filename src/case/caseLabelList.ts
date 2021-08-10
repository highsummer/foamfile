import {predicate} from "./helpers";

export namespace CaseLabelList {
  export const TypeSignature = "case.faceList" as const;
  export const is = predicate(TypeSignature)<Type>();
  export interface Type {
    type: typeof TypeSignature,
    header: {
      version: string,
      format: string,
      className: "labelList",
      object: string,
    },
    data: number[];
  }

  export function build(version: string, format: string, object: string, data: number[]): Type {
    return {
      type: TypeSignature,
      header: {
        version: version,
        format: format,
        className: "labelList",
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
