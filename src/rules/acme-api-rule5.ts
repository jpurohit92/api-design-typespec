import { createRule } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { findVersionedNamespace } from "@typespec/versioning";

/**
 * ACME API Rule 5
 *
 * APIs must follow a documented versioning strategy.
 *
 * An operation is considered versioned when either:
 *  - its route starts with a major version segment (/v1/..., /v2/...), or
 *  - it lives in a namespace decorated with `@versioned`
 *    (`@typespec/versioning`).
 */

export const acmeApiRule5 = createRule({
  name: "acme-api-rule5",
  severity: "warning",
  description:
    "API routes must declare a version, e.g. /v1/..., or use @versioned.",

  messages: {
    default:
      "API route is not versioned. Start the route with a version segment such as /v1, or use @typespec/versioning.",
  },

  create(context) {
    const program = context.program;

    return {
      operation(operation) {
        const [httpOperation] = getHttpOperation(program, operation);

        if (!httpOperation) return;

        // Versioned with @typespec/versioning.
        const namespace = operation.namespace;

        if (namespace && findVersionedNamespace(program, namespace)) {
          return;
        }

        // URL-based major versioning: /v1/...
        const [firstSegment] = httpOperation.path
          .split("/")
          .filter(Boolean);

        if (firstSegment && /^v\d+$/i.test(firstSegment)) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          messageId: "default",
        });
      },
    };
  },
});
