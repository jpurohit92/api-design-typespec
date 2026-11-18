import "@typespec/http";
import "@api-design/standards";

using TypeSpec.Http;

@service
namespace ExampleApi;

// ========================================
// SHARED MODELS
// ========================================

model Product {
  id: string;
  name: string;
}

// Shared error model (acme-api-rule4)
@error
model ErrorResponse {
  code: string;
  message: string;
}

model NotFoundResponse extends ErrorResponse {
  @statusCode _: 404;
}

model CreatedProductResponse {
  @statusCode _: 201;
  @body product: Product;
}

// ========================================
// VALID API ROUTES
// ========================================

// Valid: Resource noun
@route("/v1/users")
@get
op listUsers(): string[] | ErrorResponse;

// Valid: Resource noun
@route("/v1/orders")
@get
op listOrders(): string[] | ErrorResponse;

// Valid: Path parameter
@route("/v1/orders/{orderId}")
@get
op getOrder(@path orderId: string): string | NotFoundResponse | ErrorResponse;

// Valid: Kebab-case resource noun
@route("/v1/payment-methods")
@get
op listPaymentMethods(): string[] | ErrorResponse;

// Valid: "listings" is a noun
@route("/v1/listings")
@get
op listListings(): string[] | ErrorResponse;

// Valid: "updates" is a noun
@route("/v1/updates")
@get
op listUpdates(): string[] | ErrorResponse;

// ========================================
// INVALID API ROUTES
// ========================================

// Invalid: Starts with "get"
@route("/v1/getUsers")
@get
op getUsers(): string[] | ErrorResponse;

// Invalid: Starts with "create"
@route("/v1/createOrder")
@post
op createOrder(): string | ErrorResponse;

// Invalid: Starts with "approve"
@route("/v1/approvePayment")
@post
op approvePayment(): string | ErrorResponse;

// Invalid: Starts with "delete"
@route("/v1/delete-user")
@delete
op deleteUser(): void | ErrorResponse;

// Invalid: Starts with "fetch"
@route("/v1/fetchOrders")
@get
op fetchOrders(): string[] | ErrorResponse;

// Invalid: Starts with "cancel"
@route("/v1/cancel-order")
@post
op cancelOrder(): string | ErrorResponse;


// acme-api-rule2 validation examples

// VALID: GET without request body
@route("/v1/products")
@get
op listProducts(): Product[] | ErrorResponse;

// VALID: POST with request body (also a valid 201 Created response)
@route("/v1/products")
@post
op createProduct(
  @body product: Product
): CreatedProductResponse | ErrorResponse;

// INVALID: GET with request body
@route("/v1/products/search")
@get
op searchProducts(
  @body criteria: string
): Product[] | ErrorResponse;

// INVALID: DELETE with request body
@route("/v1/products/{productId}")
@delete
op deleteProduct(
  @path productId: string,
  @body reason: string
): void | ErrorResponse;


// acme-api-rule3 validation examples

// VALID: Declares success (200) and error (404 + default) responses
@route("/v1/customers/{customerId}")
@get
op getCustomer(
  @path customerId: string
): Product | NotFoundResponse | ErrorResponse;

// INVALID: No error response declared
@route("/v1/invoices")
@get
op listInvoices(): Product[];

// INVALID: No success response declared
@route("/v1/failures")
@get
op listFailures(): ErrorResponse;

// INVALID: Non-standard status code (418)
model TeapotResponse extends ErrorResponse {
  @statusCode _: 418;
}

@route("/v1/teapots")
@get
op listTeapots(): Product[] | TeapotResponse;


// acme-api-rule4 validation examples

// VALID: PascalCase model, camelCase properties, camelCase path parameter,
// and the shared error model
model AuditEntry {
  entryId: string;
  createdAt: string;
}

@route("/v1/audit-entries/{entryId}")
@get
op getAuditEntry(
  @path entryId: string
): AuditEntry | NotFoundResponse | ErrorResponse;

// INVALID: Model name is not PascalCase
model audit_log {
  logId: string;
}

// INVALID: Property name is not camelCase
model Shipment {
  shipmentId: string;
  Created_At: string;
}

// INVALID: Path parameter is not camelCase
@route("/v1/shipments/{shipment_id}")
@get
op listShipments(
  @path shipment_id: string
): Shipment | ErrorResponse;

// INVALID: Error response does not use the shared error model
@error
model CustomError {
  message: string;
}

@route("/v1/warehouses")
@get
op listWarehouses(): Product[] | CustomError;


// acme-api-rule5 validation examples

// VALID: URL-based major versioning (v2)
@route("/v2/users")
@get
op listUsersV2(): string[] | ErrorResponse;

// INVALID: Route has no version segment
@route("/reports")
@get
op listReports(): string[] | ErrorResponse;
