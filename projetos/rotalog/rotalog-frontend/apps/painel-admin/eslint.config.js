const nx = require("@nx/eslint-plugin");
const baseConfig = require("../../eslint.config.js");

module.exports = [
    ...baseConfig,
...nx.configs["flat/angular"],
...nx.configs["flat/angular-template"],
{
    files: ["**/*.ts"],
    rules: {
        // Segurança (ADR 0001, D5a): sem console, alert/confirm, innerHTML e bypass de sanitização.
        "no-console": "error",
        "no-restricted-globals": ["error", "alert", "confirm"],
        "no-restricted-properties": [
            "error",
            { object: "window", property: "alert", message: "Use ToastService." },
            { object: "window", property: "confirm", message: "Use ConfirmService." }
        ],
        "no-restricted-syntax": [
            "error",
            { selector: "MemberExpression[property.name=/^(innerHTML|outerHTML)$/]", message: "Não escreva HTML direto; use interpolação do template." },
            { selector: "Identifier[name=/^bypassSecurityTrust/]", message: "Não desligue a sanitização do Angular." },
            { selector: "MemberExpression[object.name=\"window\"][property.name=\"location\"]", message: "Use Router.navigate." }
        ],
        // Páginas de rota terminam em "Page" (features/<x>/<x>.page.ts); o resto em "Component".
        "@angular-eslint/component-class-suffix": [
            "error",
            { suffixes: ["Component", "Page"] }
        ],
        "@angular-eslint/directive-selector": [
            "error",
            {
                type: "attribute",
                prefix: "app",
                style: "camelCase"
            }
        ],
        "@angular-eslint/component-selector": [
            "error",
            {
                type: "element",
                prefix: "app",
                style: "kebab-case"
            }
        ]
    }
},
{
    // Specs podem espionar console e window.alert para provar que o código não os usa.
    files: ["**/*.spec.ts"],
    rules: {
        "no-console": "off",
        "no-restricted-properties": "off",
        "no-restricted-globals": "off"
    }
},
{
    // Acessibilidade (ADR 0001, D6, fase 6): regras de template como erro.
    files: ["**/*.html"],
    rules: {
        "@angular-eslint/template/click-events-have-key-events": "error",
        "@angular-eslint/template/interactive-supports-focus": "error",
        "@angular-eslint/template/label-has-associated-control": "error",
        "@angular-eslint/template/elements-content": "error",
        "@angular-eslint/template/table-scope": "error",
        "@angular-eslint/template/alt-text": "error",
        "@angular-eslint/template/valid-aria": "error",
        "@angular-eslint/template/role-has-required-aria": "error",
        "@angular-eslint/template/mouse-events-have-key-events": "error",
        "@angular-eslint/template/no-autofocus": "error",
        "@angular-eslint/template/no-distracting-elements": "error"
    }
},
{
    files: ["**/*.html"],
    // O preset recommended do typescript-eslint (via Nx) vaza para .html e
    // quebra no parser de template (sem lista de comentários).
    rules: {
        "@typescript-eslint/ban-ts-comment": "off"
    }
}
];
