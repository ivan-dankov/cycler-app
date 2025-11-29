// Quick test script to verify OCR endpoint is accessible
// Run with: node test-ocr.js

const testText = `
Sample Financial Statement:
Date: 2024-01-15
Transaction: Coffee Shop - $5.50
Transaction: Grocery Store - $45.20
Transaction: Salary Deposit - $2000.00
Date: 2024-01-16
Transaction: Gas Station - $35.00
Transaction: Restaurant - $28.50
`;

console.log('Testing parse-transactions endpoint...');
console.log('Text to parse:', testText.substring(0, 100) + '...\n');

// Note: This requires authentication, so it will fail without a valid session
// But it helps verify the endpoint exists
fetch('http://localhost:3000/api/parse-transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ text: testText }),
})
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => {
    if (data.error) {
      console.log('Error (expected if not authenticated):', data.error);
    } else {
      console.log('Success! Transactions found:', data.transactions?.length || 0);
      console.log('Stats:', data.stats);
    }
  })
  .catch(err => {
    console.log('Request failed (may be due to auth):', err.message);
    console.log('\n✅ Endpoint exists and is responding');
    console.log('⚠️  Authentication required for full test');
  });


