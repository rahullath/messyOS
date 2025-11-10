// Simple test script to verify waitlist functionality
const testEmail = 'test@example.com';
const testData = {
  email: testEmail,
  interest: 'everything',
  referrer: 'test'
};

console.log('Testing waitlist API...');

fetch('http://localhost:4321/api/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(result => {
  console.log('Waitlist API Response:', result);
  if (result.success) {
    console.log('✅ Waitlist functionality working correctly!');
  } else {
    console.log('❌ Waitlist API returned error:', result.error);
  }
})
.catch(error => {
  console.error('❌ Network error:', error);
});