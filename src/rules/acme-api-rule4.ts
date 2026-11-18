import { createRule, paramMessage } from "@typespec/compiler";
import type { Model } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

/**
 * ACME API Rule 4
 *
 * Naming and response formats must be consistent:
 *  - Model names:          PascalCase   (User, CreateUserRequest)
 *  - Property names:       camelCase    (userId, createdAt)
 *  - Path parameter names: camelCase    (/v1/users/{userId})
 *  - Error responses:      use the shared `ErrorResponse` model
 *                          (or a model that extends it)
 */

const SHARED_ERROR_MODEL = "ErrorResponse";

const pascalCase = /^[A-Z][a-zA-Z0-9]*$/;
const camelCase = /^[a-z][a-zA-Z0-9]*$/;

/** True when the model is, or extends, the shared error model. */
function extendsSharedErrorModel(model: Model): boolean {
  let current: Model | undefined = model;

  while (current) {
    if (current.name === SHARED_ERROR_MODEL) return true;
    current = current.baseModel;
  }

  return false;
}

export const acmeApiRule4 = createRule({
  name: "acme-api-rule4",
  severity: "warning",
  description:
    "Names and response formats must follow consistent conventions.",

  messages: {
    modelName: paramMessage`Model '${"name"}' must be PascalCase.`,
    propertyName: paramMessage`Property '${"name"}' must be camelCase.`,
    pathParameterName: paramMessage`Path parameter '${"name"}' must be camelCase.`,
    errorModel: paramMessage`Error responses must use the shared '${"shared"}' model, but found '${"name"}'.`,
  },

  create(context) {
    const program = context.program;

    return {
      model(model) {
        // Skip anonymous models, template instances and synthesized models.
        if (!model.name) return;
        if (model.templateMapper || model.node === undefined) return;

        if (!pascalCase.test(model.name)) {
          context.reportDiagnostic({
            target: model,
            messageId: "modelName",
            format: { name: model.name },
          });
        }

        for (const property of model.properties.values()) {
          // "_" is the conventional name for @statusCode properties.
          if (property.name === "_") continue;

          if (!camelCase.test(property.name)) {
            context.reportDiagnostic({
              target: property,
              messageId: "propertyName",
              format: { name: property.name },
            });
          }
        }
      },

      operation(operation) {
        const [httpOperation] = getHttpOperation(program, operation);

        if (!httpOperation) return;

        // Path parameter names.
        for (const match of httpOperation.path.matchAll(/\{([^}]+)\}/g)) {
          const name = match[1];

          if (!camelCase.test(name)) {
            context.reportDiagnostic({
              target: operation,
              messageId: "pathParameterName",
              format: { name },
            });
          }
        }

        // Shared error model.
        for (const response of httpOperation.responses) {
          const isErrorStatus =
            response.statusCodes === "*" ||
            (typeof response.statusCodes === "number" &&
              response.statusCodes >= 400) ||
            (typeof response.statusCodes === "object" &&
              response.statusCodes.start >= 400);

          if (!isErrorStatus) continue;

          const type = response.type;

          if (type.kind !== "Model") continue;
          if (extendsSharedErrorModel(type)) continue;

          context.reportDiagnostic({
            target: operation,
            messageId: "errorModel",
            format: {
              shared: SHARED_ERROR_MODEL,
              name: type.name || "(anonymous)",
            },
          });
        }
      },
    };
  },
});
