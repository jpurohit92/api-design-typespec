import { defineLinter } from "@typespec/compiler";

import { acmeApiRule1 } from "./rules/acme-api-rule1.js";
import { acmeApiRule2 } from "./rules/acme-api-rule2.js";
import { acmeApiRule3 } from "./rules/acme-api-rule3.js";
import { acmeApiRule4 } from "./rules/acme-api-rule4.js";
import { acmeApiRule5 } from "./rules/acme-api-rule5.js";

export const $linter = defineLinter({
  rules: [
    acmeApiRule1,
    acmeApiRule2,
    acmeApiRule3,
    acmeApiRule4,
    acmeApiRule5,
  ],

  ruleSets: {
    recommended: {
      enable: {
        [`@api-design/standards/${acmeApiRule1.name}`]: true,
        [`@api-design/standards/${acmeApiRule2.name}`]: true,
        [`@api-design/standards/${acmeApiRule3.name}`]: true,
        [`@api-design/standards/${acmeApiRule4.name}`]: true,
        [`@api-design/standards/${acmeApiRule5.name}`]: true,
      },
    },
  },
});
