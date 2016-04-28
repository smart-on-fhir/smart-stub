module.exports = {
  "env": {
    "node": true,
    "es6": true
  },
  "extends": "eslint:recommended",
  "rules": {
    /* Stylistic */
    "array-bracket-spacing": "error",
    "block-spacing": "error",
    "brace-style": "error",
    "indent": ["error", 2],
    "keyword-spacing": "error",
    "linebreak-style": ["error", "unix"],
    "quotes": ["error", "double"],
    "semi": ["error", "always"],
    /* Rule overrides */
    "no-console": "off",
    "no-unused-vars": ["error", {"args": "none"}]
  }
};
