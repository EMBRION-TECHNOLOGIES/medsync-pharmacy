/**
 * Test script to check what the API actually returns
 * Run this in browser console on the admin verification page
 */

// Copy-paste this into browser console after loading the admin page
async function testApiResponse() {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch('http://localhost:3000/api/v1/admin/pharmacies?limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('🔍 RAW API RESPONSE:', JSON.stringify(data, null, 2));
    
    // Check first pharmacy
    if (data.success && data.data && data.data.pharmacies) {
      const firstPharmacy = data.data.pharmacies[0];
      console.log('\n📋 FIRST PHARMACY:', {
        name: firstPharmacy.name,
        hasOwner: !!firstPharmacy.owner,
        owner: firstPharmacy.owner,
        hasPharmacyUsers: !!firstPharmacy.pharmacyUsers,
        pharmacyUsers: firstPharmacy.pharmacyUsers
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testApiResponse();
