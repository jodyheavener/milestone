import rootConfig from "../../eslint.config.js";
import tseslint from "typescript-eslint";

export default tseslint.config(...rootConfig);
