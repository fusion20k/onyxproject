// Test Invite Token Generator
// Run this locally to create a test invite

const { nanoid } = require('nanoid');

// Generate a secure token
const token = nanoid(32);
const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now

console.log('\n=== TEST INVITE TOKEN ===\n');
console.log('Token:', token);
console.log('Expires:', expiresAt.toISOString());
console.log('\n--- Add this to Supabase ---\n');
console.log('Go to Supabase → Table Editor → invite_tokens → Insert row\n');
console.log('email:', 'your-test-email@example.com');
console.log('token:', token);
console.log('expires_at:', expiresAt.toISOString());
console.log('used:', false);
console.log('application_id:', null);
console.log('\n--- Test URL ---\n');
console.log(`https://onyx-project.com/invite?token=${token}`);
console.log('\n');
