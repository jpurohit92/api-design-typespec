import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

// Methods whose semantics do not include a request body.
const methodsWithoutBody = new Set(["get", "head", "delete"]);

export const acmeApiRule2 = createRule({
  name: "acme-api-rule2",
  severity: "warning",
  description:
    "HTTP methods must be used according to their semantics.",

  messages: {
    default: paramMessage`HTTP method '${"verb"}' must not declare a request body.`,
  },

  create(context) {
    return {
      operation(operation) {
        const [httpOperation] = getHttpOperation(
          context.program,
          operation
        );

        const verb = httpOperation.verb;

        if (!methodsWithoutBody.has(verb)) return;

        if (httpOperation.parameters.body) {
          context.reportDiagnostic({
            target: operation,
            format: { verb: verb.toUpperCase() },
          });
        }
      },
    };
  },
});
