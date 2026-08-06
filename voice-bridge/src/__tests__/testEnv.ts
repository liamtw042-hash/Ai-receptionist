// Imported FIRST by the test files. `import` statements are hoisted, so plain
// assignments at the top of a test would run *after* ./config had already
// loaded and thrown. Putting them in their own module makes the ordering
// explicit and reliable.
process.env.OPENAI_API_KEY ||= 'sk-test-key';
process.env.BACKEND_API_URL ||= 'https://example.test/api';
process.env.VOICE_BRIDGE_SECRET ||= 'test-secret';
process.env.PUBLIC_URL ||= 'https://bridge.example.test';
process.env.TWILIO_ACCOUNT_SID ||= 'ACtest';
process.env.TWILIO_AUTH_TOKEN ||= 'test-token';

export {};
