const axios = require('axios');

const API_BASE = 'http://localhost:8000';

// Test data
const SUPER_ADMIN = {
  email: 'sgul@trafix.com',
  password: 'admin123'
};

const TEST_USER = {
  name: 'Test User KPI Access',
  email: 'testuser2@company.com',  // Using different email to avoid conflicts
  password: 'testpass123'
};

const PERMISSION_DATA = {
  module_name: 'kpis',
  action_name: 'header_navigation',
  display_name: 'KPIs Header Navigation',
  description: 'Ability to see and access KPI navigation elements'
};

let adminToken = '';
let testUserToken = '';
let createdPermissionId = '';
let createdUserId = '';

async function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function step1_loginAsAdmin() {
  try {
    await log('Step 1: Logging in as super admin...');
    
    const response = await axios.post(`${API_BASE}/auth/login`, SUPER_ADMIN);
    
    if (response.data.access_token) {
      adminToken = response.data.access_token;
      await log(`Successfully logged in as ${response.data.user.name}`, 'success');
      return true;
    }
  } catch (error) {
    await log(`Login failed: ${error.response?.data?.detail || error.message}`, 'error');
    return false;
  }
}

async function step2_createPermission() {
  try {
    await log('Step 2: Creating granular permission...');
    
    const response = await axios.post(
      `${API_BASE}/access-control/granular-permissions`,
      PERMISSION_DATA,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );
    
    if (response.data.id) {
      createdPermissionId = response.data.id;
      await log(`Permission created successfully with ID: ${response.data.id}`, 'success');
      await log(`Permission key: ${response.data.permission_key}`);
      return true;
    }
  } catch (error) {
    await log(`Failed to create permission: ${error.response?.data?.detail || error.message}`, 'error');
    return false;
  }
}

async function step3_createUser() {
  try {
    await log('Step 3: Creating test user...');
    
    // Create user by directly inserting into database (simulating user creation)
    const { execSync } = require('child_process');
    
    const createUserScript = `
cd /home/runner/work/evaluationProject/evaluationProject/backend && python3 -c "
from utils.password import hash_password
import sqlite3
from datetime import datetime

# Hash the password
password_hash = hash_password('${TEST_USER.password}')

# Connect to database
conn = sqlite3.connect('data/employee_eval.db')
cursor = conn.cursor()

# Check if user already exists
cursor.execute('SELECT id FROM users WHERE email = ?', ('${TEST_USER.email}',))
existing_user = cursor.fetchone()

if existing_user:
    print(f'User already exists with ID: {existing_user[0]}')
    user_id = existing_user[0]
else:
    # Insert test user
    cursor.execute('''
        INSERT INTO users (name, email, password_hash, role_id, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('${TEST_USER.name}', '${TEST_USER.email}', password_hash, 2, True, datetime.utcnow()))
    
    user_id = cursor.lastrowid
    print(f'Test user created with ID: {user_id}')

conn.commit()
conn.close()
"
    `;
    
    const result = execSync(createUserScript, { encoding: 'utf8' });
    const userIdMatch = result.match(/ID: (\d+)/);
    
    if (userIdMatch) {
      createdUserId = userIdMatch[1];
      await log(`Test user created/found with ID: ${createdUserId}`, 'success');
      return true;
    }
  } catch (error) {
    await log(`Failed to create user: ${error.message}`, 'error');
    return false;
  }
}

async function step4_assignPermission() {
  try {
    await log('Step 4: Assigning permission to user...');
    
    const permissionData = {
      permission_id: parseInt(createdPermissionId),
      module_name: PERMISSION_DATA.module_name,
      action_name: PERMISSION_DATA.action_name
    };
    
    const response = await axios.post(
      `${API_BASE}/access-control/users/${createdUserId}/permissions`,
      permissionData,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );
    
    if (response.data.id) {
      await log(`Permission assigned successfully! Assignment ID: ${response.data.id}`, 'success');
      return true;
    }
  } catch (error) {
    await log(`Failed to assign permission: ${error.response?.data?.detail || error.message}`, 'error');
    return false;
  }
}

async function step5_loginAsTestUser() {
  try {
    await log('Step 5: Logging in as test user...');
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.data.access_token) {
      testUserToken = response.data.access_token;
      await log(`Successfully logged in as ${response.data.user.name}`, 'success');
      await log(`User role: ${response.data.user.role.name}`);
      return true;
    }
  } catch (error) {
    await log(`Login failed: ${error.response?.data?.detail || error.message}`, 'error');
    return false;
  }
}

async function step6_checkPermissions() {
  try {
    await log('Step 6: Checking granular permissions...');
    
    // Test admin check
    const adminResponse = await axios.get(
      `${API_BASE}/access-control/users/${createdUserId}/check-permission/${PERMISSION_DATA.module_name}/${PERMISSION_DATA.action_name}`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );
    
    if (adminResponse.data.has_permission) {
      await log(`Admin check: User has the granular permission: ${PERMISSION_DATA.module_name}.${PERMISSION_DATA.action_name}`, 'success');
      
      // Test user self-check
      const userResponse = await axios.get(
        `${API_BASE}/users/me/check-granular-permission/${PERMISSION_DATA.module_name}/${PERMISSION_DATA.action_name}`,
        {
          headers: { 'Authorization': `Bearer ${testUserToken}` }
        }
      );
      
      if (userResponse.data.has_permission) {
        await log('User self-check: User can check their own permission!', 'success');
        await log('🎉 Both admin and user permission checks work correctly!', 'success');
        return true;
      } else {
        await log('User self-check failed', 'error');
        return false;
      }
    } else {
      await log(`User does NOT have the permission: ${PERMISSION_DATA.module_name}.${PERMISSION_DATA.action_name}`, 'error');
      return false;
    }
  } catch (error) {
    await log(`Failed to check permissions: ${error.response?.data?.detail || error.message}`, 'error');
    return false;
  }
}

async function runTest() {
  console.log('🚀 Starting Access Control System Test\n');
  console.log('This test validates the granular access control system for KPIs header navigation.\n');
  
  const steps = [
    step1_loginAsAdmin,
    step2_createPermission,
    step3_createUser,
    step4_assignPermission,
    step5_loginAsTestUser,
    step6_checkPermissions
  ];
  
  let allPassed = true;
  
  for (let i = 0; i < steps.length; i++) {
    const result = await steps[i]();
    if (!result) {
      allPassed = false;
      break;
    }
    console.log(''); // Add spacing between steps
  }
  
  console.log('=' * 50);
  if (allPassed) {
    await log('🎉 ALL TESTS PASSED! The granular access control system is working correctly.', 'success');
    console.log('\n📋 Next steps to verify frontend integration:');
    console.log('1. Open the React app at http://localhost:5173');
    console.log(`2. Login as ${TEST_USER.email} with password ${TEST_USER.password}`);
    console.log('3. Verify that "KPIs" appears in the navigation bar');
    console.log('4. Click on "KPIs" to verify access to the page');
    console.log('5. If KPIs navigation is visible and accessible, the frontend integration is working!');
  } else {
    await log('❌ TESTS FAILED! Please check the errors above.', 'error');
  }
  console.log('=' * 50);
}

// Check if axios is available
try {
  require('axios');
  runTest().catch(console.error);
} catch (error) {
  console.log('❌ axios is required to run this test. Install it with: npm install axios');
  process.exit(1);
}