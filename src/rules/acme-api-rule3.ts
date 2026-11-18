import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import type { HttpOperationResponse } from "@typespec/http";

/**
 * ACME API Rule 3
 *
 * Operations must declare meaningful HTTP status codes:
 *  - at least one success (2xx) response
 *  - at least one error (4xx / 5xx / default) response
 *  - only standard status codes
 *
 * Operations are not required to declare every error code.
 */

const standardStatusCodes = new Set([
  // Success
  200, 201, 202, 204,
  // Client errors
  400, 401, 403, 404, 409, 422, 429,
  // Server errors
  500, 502, 503,
]);

type StatusCodes = HttpOperationResponse["statusCodes"];

function isSuccess(statusCodes: StatusCodes): boolean {
  if (statusCodes === "*") return false;

  if (typeof statusCodes === "number") {
    return statusCodes >= 200 && statusCodes < 300;
  }

  return statusCodes.start >= 200 && statusCodes.end < 300;
}

function isError(statusCodes: StatusCodes): boolean {
  // "*" is the default response, which TypeSpec uses for @error models.
  if (statusCodes === "*") return true;

  if (typeof statusCodes === "number") {
    return statusCodes >= 400;
  }

  return statusCodes.start >= 400;
}

export const acmeApiRule3 = createRule({
  name: "acme-api-rule3",
  severity: "warning",
  description:
    "Operations must declare meaningful success and error HTTP status codes.",

  messages: {
    noSuccessResponse:
      "Operation does not declare a success (2xx) response.",
    noErrorResponse:
      "Operation does not declare an error (4xx/5xx) response.",
    nonStandardStatus: paramMessage`Operation declares non-standard status code ${"code"}.`,
  },

  create(context) {
    return {
      operation(operation) {
        const [httpOperation] = getHttpOperation(
          context.program,
          operation
        );

        if (!httpOperation) {
          return;
        }

        const responses = httpOperation.responses;

        if (!responses.some((r) => isSuccess(r.statusCodes))) {
          context.reportDiagnostic({
            target: operation,
            messageId: "noSuccessResponse",
          });
        }

        if (!responses.some((r) => isError(r.statusCodes))) {
          context.reportDiagnostic({
            target: operation,
            messageId: "noErrorResponse",
          });
        }

        for (const response of responses) {
          const { statusCodes } = response;

          if (
            typeof statusCodes === "number" &&
            !standardStatusCodes.has(statusCodes)
          ) {
            context.reportDiagnostic({
              target: operation,
              messageId: "nonStandardStatus",
              format: { code: String(statusCodes) },
            });
          }
        }
      },
    };
  },
});
