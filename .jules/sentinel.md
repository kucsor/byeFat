## 2026-02-02 - AI Flow Error Leakage
**Vulnerability:** Raw error messages from the AI provider were being returned directly to the client in `portion-calculator-flow.ts`.
**Learning:** Even with `try/catch`, explicit checks for specific error types (like API keys) can lead to a pattern where unknown errors are leaked by default in the `else` block if not carefully handled.
**Prevention:** Always use a "deny by default" approach for error messages. Explicitly whitelist safe messages, and return a generic error for everything else.
