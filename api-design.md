# REST API Design Rules

These five rules define a simple, consistent baseline for REST API design. They can also serve as the starting point for a custom TypeSpec linter.

## 1. Use nouns, not verbs, in resource paths

**Rule ID:** `acme-api-rule1`

Represent resources with nouns. Use HTTP methods to express actions.

**Good:** `GET /v1/users`  
**Avoid:** `GET /v1/getUsers`

**TypeSpec enforcement:** Custom lint rule that inspects route segments and flags known action verbs. This is heuristic and should allow documented exceptions.

## 2. Use HTTP methods according to their semantics

**Rule ID:** `acme-api-rule2`

| Method | Intended use |
| --- | --- |
| `GET` | Retrieve a resource without changing server state |
| `POST` | Create a resource or initiate an operation |
| `PUT` | Replace a resource |
| `PATCH` | Partially update a resource |
| `DELETE` | Delete a resource |

**TypeSpec enforcement:** Use the `@typespec/http` decorators and add custom lint rules for organization-specific method conventions. Method correctness may require human review of behavior.

## 3. Declare meaningful HTTP status codes

**Rule ID:** `acme-api-rule3`

Use standard status codes and document expected success and error responses.

| Status | Meaning |
| --- | --- |
| `200 OK` | Request succeeded |
| `201 Created` | Resource created |
| `204 No Content` | Successful request with no response body |
| `400 Bad Request` | Invalid request |
| `401 Unauthorized` | Authentication is required or failed |
| `403 Forbidden` | Caller lacks permission |
| `404 Not Found` | Resource does not exist |
| `500 Internal Server Error` | Unexpected server failure |

**TypeSpec enforcement:** Check that operations declare suitable success and error response status codes. Avoid requiring every operation to return every error code.

## 4. Keep naming and response formats consistent

**Rule ID:** `acme-api-rule4`

Use predictable paths, identifiers, model names, property names, and error structures.

**Good paths:** `/v1/users/{userId}` and `/v1/orders/{orderId}`  
**Model names:** `User`, `CreateUserRequest`  
**Property names:** `userId`, `createdAt`

Define a shared error model and use it consistently across services.

**TypeSpec enforcement:** Use existing TypeSpec naming rules where suitable, plus custom checks for route and response conventions.

## 5. Design for change without breaking clients

**Rule ID:** `acme-api-rule5`

Prefer backward-compatible additions. Use a documented versioning strategy, review breaking changes, and provide a deprecation period when feasible.

**Example:** `/v1/users` and `/v2/users` if URL-based major versioning is the chosen strategy. Other versioning approaches are also valid.

**TypeSpec enforcement:** Use `@typespec/versioning` where appropriate and compare generated contracts or API snapshots in CI to detect breaking changes. A single-file linter cannot reliably detect all compatibility issues.

---

## TypeSpec Governance Checklist

- [ ] Resource routes use nouns and consistent naming.
- [ ] HTTP methods match operation semantics.
- [ ] Success and error responses declare meaningful status codes.
- [ ] Models, properties, identifiers, and errors follow shared conventions.
- [ ] API changes are reviewed for backward compatibility and versioning.

## Suggested Linter Rules

| Rule ID | Purpose | Initial severity |
| --- | --- | --- |
| `resource-noun-routes` | Flag action verbs in resource paths | Warning |
| `http-method-conventions` | Check organization-specific HTTP method conventions | Warning |
| `response-status-codes` | Check declared success/error responses | Warning |
| `consistent-naming` | Enforce agreed naming patterns | Warning |
| `versioning-policy` | Check versioning conventions | Warning |

> Start with warnings, validate rules against existing APIs, and promote reliable checks to errors in CI. These rule IDs are proposed custom rules, not built-in TypeSpec rules.
