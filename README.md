# @api-design/standards

A shared [TypeSpec](https://typespec.io) **linter library** that enforces the ACME REST API design rules described in [`api-design.md`](./api-design.md).

You write your API contract in TypeSpec, add this package to the project, and `tsp compile` reports a warning for every operation or model that breaks the rules. The same rule set can be installed in any number of API projects, so every team is checked against one consistent standard.

---

## Table of contents

1. [What this project is](#what-this-project-is)
2. [The rules](#the-rules)
3. [Project structure](#project-structure)
4. [How it works](#how-it-works)
5. [Setting up this project](#setting-up-this-project)
6. [Using the library in a new project](#using-the-library-in-a-new-project)
7. [Configuring the rules](#configuring-the-rules)
8. [Adding or changing a rule](#adding-or-changing-a-rule)
9. [Design decisions and limitations](#design-decisions-and-limitations)
10. [Troubleshooting](#troubleshooting)

---

## What this project is

TypeSpec has a built-in linter framework. A TypeSpec library can export a `$linter` object containing **rules** and **rule sets**. When a consuming project's `tspconfig.yaml` extends one of those rule sets, the compiler runs each rule against the compiled program and prints any diagnostics.

This repository is exactly that: a library that exports five custom rules and one rule set (`recommended`). It also contains an example TypeSpec service (`examples/basic`) that deliberately contains both valid and invalid code, so you can see every rule fire.

| Item | Value |
| --- | --- |
| Package name | `@api-design/standards` |
| Rule set | `@api-design/standards/recommended` |
| Rule ID format | `@api-design/standards/acme-api-ruleN` |
| Default severity | `warning` |
| TypeSpec compiler | `^1.18.0` |

---

## The rules

All rules report **warnings**. They are heuristics: they catch the common mistakes and leave nuanced judgement to code review.

| Rule ID | Policy | What it checks |
| --- | --- | --- |
| `acme-api-rule1` | Use nouns, not verbs, in resource paths | The first word of each route segment must not be an action verb (`get`, `create`, `update`, `delete`, `fetch`, `list`, `remove`, `add`, `modify`, `approve`, `reject`, `cancel`, `validate`, `process`, `execute`, `submit`, `activate`, `deactivate`). Segments are split on `camelCase`, `-` and `_`, so `/getUsers` and `/delete-user` are flagged, while `/listings`, `/updates` and `/payment-methods` are fine. Path parameters (`{id}`) and version segments (`v1`) are ignored. |
| `acme-api-rule2` | Use HTTP methods according to their semantics | `GET`, `HEAD` and `DELETE` operations must not declare a request body. |
| `acme-api-rule3` | Declare meaningful HTTP status codes | An operation must declare a success (2xx) response and an error (4xx/5xx or default) response, and may only use standard status codes (200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503). It does not require every error code. |
| `acme-api-rule4` | Keep naming and response formats consistent | Model names are `PascalCase`, property names and path parameters are `camelCase`, and error responses use the shared `ErrorResponse` model (or a model extending it). |
| `acme-api-rule5` | Design for change without breaking clients | Routes must start with a major version segment (`/v1/...`, `/v2/...`), or the operation must live in a namespace decorated with `@versioned` from `@typespec/versioning`. |

### Examples

```tsp
// rule1: noun, not verb
@route("/v1/users")     @get op listUsers(): User[] | ErrorResponse;   // OK
@route("/v1/getUsers")  @get op getUsers():  User[] | ErrorResponse;   // warning

// rule2: no body on GET / DELETE
@route("/v1/products/search") @get
op searchProducts(@body criteria: string): Product[] | ErrorResponse;  // warning

// rule3: declare an error response
@route("/v1/invoices") @get
op listInvoices(): Product[];                                          // warning (no 4xx/5xx)

// rule4: shared error model, camelCase names
@error model CustomError { message: string; }                          // op using it -> warning

// rule5: versioned route
@route("/reports") @get op listReports(): Report[] | ErrorResponse;    // warning (no /vN)
```

---

## Project structure

```
api-design-typespec/
├── api-design.md                 # The human-readable API design policy (source of truth)
├── package.json                  # Package metadata and build script
├── tsconfig.json                 # TypeScript config: src/ -> dist/
├── src/
│   ├── index.ts                  # Library entry point: exports $lib and $linter
│   ├── lib.ts                    # TypeSpec library definition ($lib)
│   ├── linter.ts                 # Registers all rules + defines the "recommended" rule set
│   └── rules/
│       ├── acme-api-rule1.ts     # Verbs in paths
│       ├── acme-api-rule2.ts     # HTTP method semantics
│       ├── acme-api-rule3.ts     # Status codes
│       ├── acme-api-rule4.ts     # Naming and error model consistency
│       └── acme-api-rule5.ts     # Versioning
├── dist/                         # Compiled JavaScript (generated by `npm run build`)
└── examples/
    └── basic/
        ├── main.tsp              # Example service with valid and invalid operations
        └── tspconfig.yaml        # Enables the "recommended" rule set
```

### Key files

- **`src/index.ts`**: the compiler looks for two named exports on a library: `$lib` and `$linter`. This file re-exports both.
- **`src/lib.ts`**: calls `createTypeSpecLibrary({ name: "@api-design/standards", ... })`. The name here must match the `name` in `package.json`, because it forms the prefix of every rule ID.
- **`src/linter.ts`**: calls `defineLinter({ rules, ruleSets })`. The `rules` array makes the rules known to the compiler. The `recommended` rule set turns them on. **A rule that is missing from either place silently does nothing.**
- **`src/rules/*.ts`**: one file per rule. Each exports a rule created with `createRule` (an alias of `createLinterRule`) from `@typespec/compiler`.
- **`examples/basic/main.tsp`**: a living test suite. Each rule has a section of valid and invalid examples, and invalid ones are marked with `// INVALID`.

---

## How it works

1. **Compile.** `tsc` turns `src/**/*.ts` into `dist/**/*.js`. `package.json` points `main` at `dist/index.js`.
2. **Load.** A consuming project does `import "@api-design/standards";` in its `.tsp` file. The TypeSpec compiler loads the package and reads `$lib` and `$linter`.
3. **Enable.** The consumer's `tspconfig.yaml` says `linter.extends: ["@api-design/standards/recommended"]`. That enables every rule listed in the `recommended` rule set.
4. **Run.** After type-checking, the compiler walks the program and calls each enabled rule's `create(context)`. The returned object contains *listeners* (for example `operation(op) {}` and `model(m) {}`) that the compiler invokes for each matching type.
5. **Report.** A listener calls `context.reportDiagnostic({ target, messageId, format })`. The compiler prints it with the rule ID, file, line and a code frame.

### How rules inspect operations

Rules 1–5 use `getHttpOperation(program, operation)` from `@typespec/http`. It returns the *fully resolved* HTTP view of an operation: its verb, its final path (including routes inherited from namespaces and interfaces), its request body, and every response with its status code. This is more accurate than reading the `@route` decorator directly, which returns only the route fragment declared on that one operation.

Rule 5 additionally calls `findVersionedNamespace` from `@typespec/versioning` to detect `@versioned` namespaces.

---

## Setting up this project

### Prerequisites

- Node.js 20 or newer (developed on Node 24)
- npm

### Install and build

```bash
npm install
npm run build
```

`npm run build` runs `tsc -p tsconfig.json` and writes the compiled library to `dist/`. **Rebuild after every change to `src/`.** The TypeSpec compiler loads the compiled `dist/` code, not the `.ts` sources.

### Validate with the example

```bash
npx tsp compile examples/basic --no-emit
```

Expected result: **16 warnings**, one for each deliberately invalid example.

| Rule | Warnings | Operations / models flagged |
| --- | --- | --- |
| `acme-api-rule1` | 6 | `getUsers`, `createOrder`, `approvePayment`, `deleteUser`, `fetchOrders`, `cancelOrder` |
| `acme-api-rule2` | 2 | `searchProducts` (GET with body), `deleteProduct` (DELETE with body) |
| `acme-api-rule3` | 3 | `listInvoices` (no error response), `listFailures` (no success response), `listTeapots` (status 418) |
| `acme-api-rule4` | 4 | model `audit_log`, property `Created_At`, path parameter `{shipment_id}`, error model `CustomError` |
| `acme-api-rule5` | 1 | `listReports` (no version segment) |

If the number of warnings changes, a rule or an example has regressed.

### Make warnings fail the build

Rules are warnings by default, so `tsp compile` exits with code `0`. For CI, add `--warn-as-error`:

```bash
npx tsp compile examples/basic --no-emit --warn-as-error   # exit code 1 when any rule fires
```

---

## Using the library in a new project

There are four ways to install the package. Pick the one that matches how you share code.

### Step 0: choose how to install `@api-design/standards`

**A. Local tarball** (quick, no registry needed; tested)

```bash
# In this repository
npm run build
npm pack                      # creates api-design-standards-1.0.0.tgz

# In the new project
npm install /path/to/api-design-standards-1.0.0.tgz
```

**B. Local folder link** (best while developing the rules)

```bash
# In the new project
npm install /path/to/api-design-typespec
```

npm links to the folder. After you edit a rule, run `npm run build` in this repository and the new project picks up the change.

**C. Git repository**

```bash
npm install git+https://github.com/<org>/api-design-typespec.git
```

`dist/` must be available in the installed copy. Either commit `dist/`, or add `"prepare": "npm run build"` to the `scripts` in `package.json` so npm builds it on install.

**D. Private or public npm registry**

```bash
# In this repository (after setting the name, version and registry)
npm run build
npm publish

# In the new project
npm install @api-design/standards
```

### Step 1: create the new TypeSpec project

```bash
mkdir my-api && cd my-api
npm init -y
npm pkg set type=module
npm install @typespec/compiler @typespec/http
```

Then install `@api-design/standards` using one of the options in Step 0.

`@typespec/versioning` is installed automatically as a dependency of `@api-design/standards`. Keep `@typespec/compiler` and `@typespec/http` on compatible versions (`^1.18.0`) to avoid two copies of the compiler being loaded.

### Step 2: add `tspconfig.yaml`

```yaml
linter:
  extends:
    - "@api-design/standards/recommended"
```

### Step 3: import the library in `main.tsp`

```tsp
import "@typespec/http";
import "@api-design/standards";

using TypeSpec.Http;

@service
namespace MyApi;

// Shared error model used by rule 4
@error
model ErrorResponse {
  code: string;
  message: string;
}

model User {
  id: string;
  name: string;
}

@route("/v1/users")
@get
op listUsers(): User[] | ErrorResponse;
```

The `import "@api-design/standards";` line is required. Without it the compiler never loads the library, and the `extends` entry in `tspconfig.yaml` will fail to resolve.

### Step 4: compile

```bash
npx tsp compile . --no-emit
```

You should see `Compilation completed successfully.` for a compliant API, or one warning per violation, for example:

```
main.tsp:18:4 - warning @api-design/standards/acme-api-rule1: API path contains an action verb. Use resource-oriented naming.
> 18 | op getUsers(): string[];
     |    ^^^^^^^^
```

### Using the lint step in CI

Add a script to the new project's `package.json`:

```json
{
  "scripts": {
    "lint:api": "tsp compile . --no-emit --warn-as-error"
  }
}
```

Run `npm run lint:api` in your pipeline. Start with warnings only, check the rules against your existing APIs, and then turn on `--warn-as-error`, as recommended in `api-design.md`.

---

## Configuring the rules

All of the following go in the consuming project's `tspconfig.yaml`.

### Use every rule (recommended)

```yaml
linter:
  extends:
    - "@api-design/standards/recommended"
```

### Disable a rule (a reason is required)

```yaml
linter:
  extends:
    - "@api-design/standards/recommended"
  disable:
    "@api-design/standards/acme-api-rule5": "Internal API, versioned by deployment"
```

### Enable only specific rules

```yaml
linter:
  enable:
    "@api-design/standards/acme-api-rule1": true
    "@api-design/standards/acme-api-rule3": true
```

### Suppress a single occurrence

Use the `#suppress` directive on the operation or model, with a reason:

```tsp
#suppress "@api-design/standards/acme-api-rule1" "Legacy path kept for backward compatibility"
@route("/v1/getUsers")
@get
op getUsers(): User[] | ErrorResponse;
```

This is the documented-exception mechanism that `api-design.md` expects for the heuristic rules.

---

## Adding or changing a rule

Example: add a hypothetical `acme-api-rule6`.

1. **Create** `src/rules/acme-api-rule6.ts`:

   ```ts
   import { createRule } from "@typespec/compiler";
   import { getHttpOperation } from "@typespec/http";

   export const acmeApiRule6 = createRule({
     name: "acme-api-rule6",
     severity: "warning",
     description: "What the rule enforces.",
     messages: {
       default: "Message shown to the user.",
     },
     create(context) {
       return {
         operation(operation) {
           const [httpOperation] = getHttpOperation(context.program, operation);
           if (!httpOperation) return;

           // ...inspect httpOperation (verb, path, parameters, responses)...

           context.reportDiagnostic({ target: operation, messageId: "default" });
         },
       };
     },
   });
   ```

   For a message with placeholders, use `paramMessage`:

   ```ts
   messages: {
     default: paramMessage`Found '${"name"}'.`,
   },
   // ...
   context.reportDiagnostic({ target, messageId: "default", format: { name: "x" } });
   ```

2. **Register** it in `src/linter.ts`, in **both** places:

   ```ts
   import { acmeApiRule6 } from "./rules/acme-api-rule6.js";

   rules: [ /* ... */ acmeApiRule6 ],

   ruleSets: {
     recommended: {
       enable: {
         /* ... */
         [`@api-design/standards/${acmeApiRule6.name}`]: true,
       },
     },
   },
   ```

3. **Add examples** to `examples/basic/main.tsp`, with one valid and at least one invalid case, and keep every other rule satisfied so that only the intended rule fires.
4. **Build and validate**:

   ```bash
   npm run build
   npx tsp compile examples/basic --no-emit
   ```

5. **Document** the rule in `api-design.md` and in the [rules table](#the-rules) above.

Note the `.js` extension on relative imports (`"./rules/acme-api-rule6.js"`). It is required by `moduleResolution: NodeNext`, even though the source file is `.ts`.

---

## Design decisions and limitations

- **Heuristic checks.** Rules 1, 3 and 5 look for signals of good design, not proof of it. Rule 1 matches the first *word* of a segment against a verb list, so a verb-like resource name that is not in the list passes, and a segment whose first word is a listed verb is flagged even if it is a noun in your domain. Use `#suppress` for those cases.
- **Shared error model name.** `api-design.md` calls for "a shared error model" but does not name it. Rule 4 uses `ErrorResponse`. Change the `SHARED_ERROR_MODEL` constant in `src/rules/acme-api-rule4.ts` to use another name.
- **Status code list.** The allowed list in rule 3 is the policy table plus the common codes 202, 409, 422, 429, 502 and 503. Edit `standardStatusCodes` in `src/rules/acme-api-rule3.ts` to make it stricter or looser.
- **Route casing is not checked.** Rule 4 checks parameters, models and properties, but not the casing of static route segments. Otherwise `/v1/getUsers` would be reported by both rule 1 and rule 4.
- **Rule 2 only checks what can be proven.** It flags bodies on `GET`, `HEAD` and `DELETE`. Whether a `POST` really "creates or initiates an operation" needs human review.
- **Versioning is only partly checkable.** Rule 5 checks that a versioning scheme is present. It cannot detect breaking changes between versions. For that, compare generated contracts such as OpenAPI snapshots in CI, as noted in `api-design.md`.
- **Rule 4 skips anonymous and template-generated models.** Only named, user-declared models are checked for naming. The example compiles without any warnings from `@typespec/http` library types.

---

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| Compile succeeds but nothing is reported | The rule is not in `rules: [...]` **and** in `recommended.enable` in `src/linter.ts`, or you forgot `npm run build`. |
| `Cannot find module` / library not found for `@api-design/standards` | The package is not installed in the consuming project, or `dist/` is missing. Run `npm run build` and reinstall. |
| `Property 'x' does not exist on type 'RoutePath'` | `getRoutePath` returns an object, so use `.path`. Better, use `getHttpOperation(...)` and read `httpOperation.path`. |
| `Module './rules/...js' has no exported member` | The rule file is empty or does not export the name that `linter.ts` imports. |
| Diagnostic message shows a literal `{name}` | The message was written as a plain string. Use `paramMessage` and `format`. |
| A change to a rule has no effect in another project | The project is using an old copy. With the folder-link install, rebuild here. With a tarball, run `npm pack` again and reinstall. |
| Warnings do not fail CI | Rules are warnings by default. Compile with `--warn-as-error`. |
