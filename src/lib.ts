
import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@api-design/standards",
  diagnostics: {},
});

export const { reportDiagnostic, createDiagnostic } = $lib;
