
import { createRule } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

/**
 * ACME API Rule 1
 *
 * REST API paths must use resource-oriented naming.
 * Action verbs should not appear at the beginning
 * of resource path segments.
 */

const actionVerbs = [
  "get",
  "create",
  "update",
  "delete",
  "fetch",
  "list",
  "remove",
  "add",
  "modify",
  "approve",
  "reject",
  "cancel",
  "validate",
  "process",
  "execute",
  "submit",
  "activate",
  "deactivate",
];

/**
 * Splits a path segment into individual words.
 *
 * Examples:
 * getUsers       -> ["get", "users"]
 * createOrder    -> ["create", "order"]
 * approvePayment -> ["approve", "payment"]
 * payment-methods -> ["payment", "methods"]
 * listings       -> ["listings"]
 */
function splitWords(segment: string): string[] {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/[-_\s]+/)
    .map((word) => word.toLowerCase())
    .filter(Boolean);
}

/**
 * Checks whether a segment starts with
 * a known action verb.
 */
function containsActionVerb(segment: string): boolean {
  const words = splitWords(segment);

  if (words.length === 0) {
    return false;
  }

  return actionVerbs.includes(words[0]);
}

export const acmeApiRule1 = createRule({
  name: "acme-api-rule1",

  severity: "warning",

  description:
    "REST API paths must use resource nouns instead of action verbs.",

  messages: {
    default:
      "API path contains an action verb. Use resource-oriented naming.",
  },

  create(context) {
    return {
      operation(operation) {
        // Resolve the complete HTTP operation path.
        const [httpOperation] = getHttpOperation(
          context.program,
          operation
        );

        if (!httpOperation) {
          return;
        }

        const route = httpOperation.path;

        if (!route) {
          return;
        }

        // Split URI into path segments.
        const segments = route
          .split("/")
          .filter(Boolean);

        for (const segment of segments) {
          // Ignore path parameters: {userId}
          if (
            segment.startsWith("{") &&
            segment.endsWith("}")
          ) {
            continue;
          }

          // Ignore API versions: v1, v2, v10
          if (/^v\d+$/i.test(segment)) {
            continue;
          }

          if (containsActionVerb(segment)) {
            context.reportDiagnostic({
              target: operation,
              messageId: "default",
            });

            // Report once per operation.
            break;
          }
        }
      },
    };
  },
});
