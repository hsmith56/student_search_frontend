import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores([
    "app/dashboard/**/*",
    "app/dashv2/**/*",
    "features/dashboard/**/*",
    "features/manager-dashboard/**/*",
    "app/rpm/**/*",
    "features/rpm-dashboard/**/*",
  ]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
]);
