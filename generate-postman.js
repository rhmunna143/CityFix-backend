const fs = require('fs');

const collection = {
  info: {
    name: 'CityFix-backend',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    {
      key: 'devBaseUrl',
      value: 'http://localhost:3000',
    }
  ],
  item: [
    {
      name: 'Auth',
      item: [
        { name: 'register', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/auth/register', body: { mode: 'raw', raw: '{"name":"Citizen","email":"citizen@cityfix.local","password":"securepassword123","phone":"1234567890"}' } } },
        { name: 'login', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/auth/login', body: { mode: 'raw', raw: '{"email":"citizen@cityfix.local","password":"securepassword123"}' } } },
        { name: 'google-login', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/auth/google', body: { mode: 'raw', raw: '{"idToken":"abc"}' } } },
        { name: 'refresh-token', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/auth/refresh-token' } },
        { name: 'forgot-password', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/auth/forgot-password', body: { mode: 'raw', raw: '{"email":"citizen@cityfix.local"}' } } },
        { name: 'verify-otp', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/auth/verify-otp', body: { mode: 'raw', raw: '{"email":"citizen@cityfix.local","otp":"123456"}' } } },
        { name: 'reset-password', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/auth/reset-password', body: { mode: 'raw', raw: '{"email":"citizen@cityfix.local","otp":"123456","newPassword":"newpassword"}' } } },
        { name: 'logout', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/auth/logout' } },
      ],
    },
    {
      name: 'Users',
      item: [
        { name: 'get-me', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/users/me' } },
        { name: 'update-me', request: { method: 'PATCH', url: '{{devBaseUrl}}/api/v1/users/me', body: { mode: 'raw', raw: '{"name":"New Name","phone":"0987654321"}' } } },
        { name: 'update-avatar', request: { method: 'PATCH', url: '{{devBaseUrl}}/api/v1/users/me/avatar', body: { mode: 'formdata', formdata: [{ key: 'file', type: 'file', src: '' }] } } },
        { name: 'change-password', request: { method: 'PATCH', url: '{{devBaseUrl}}/api/v1/users/change-password', body: { mode: 'raw', raw: '{"oldPassword":"securepassword123","newPassword":"newsecurepassword123"}' } } },
      ],
    },
    {
      name: 'Departments',
      item: [
        { name: 'create-dept', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/departments', body: { mode: 'raw', raw: '{"name":"New Dept","description":"Test dept"}' } } },
        { name: 'get-depts', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/departments' } },
        { name: 'update-dept', request: { method: 'PATCH', url: '{{devBaseUrl}}/api/v1/departments/:id', body: { mode: 'raw', raw: '{"name":"Updated Dept"}' } } },
        { name: 'delete-dept', request: { method: 'DELETE', url: '{{devBaseUrl}}/api/v1/departments/:id' } },
      ]
    },
    {
      name: 'Categories',
      item: [
        { name: 'create-cat', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/categories', body: { mode: 'raw', raw: '{"name":"Pothole","description":"Fix it","slaHours":48,"departmentId":"<UUID>"}' } } },
        { name: 'get-cats', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/categories' } },
        { name: 'update-cat', request: { method: 'PATCH', url: '{{devBaseUrl}}/api/v1/categories/:id', body: { mode: 'raw', raw: '{"basePrice":100}' } } },
        { name: 'delete-cat', request: { method: 'DELETE', url: '{{devBaseUrl}}/api/v1/categories/:id' } },
      ]
    },
    {
      name: 'Complaints',
      item: [
        { name: 'create-complaint', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/complaints', body: { mode: 'raw', raw: '{"categoryId":"<UUID>","title":"Pothole","description":"Big pothole","latitude":12.3,"longitude":45.6,"address":"Main st"}' } } },
        { name: 'get-complaints', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/complaints' } },
        { name: 'get-single-complaint', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/complaints/:id' } },
        { name: 'update-status', request: { method: 'PATCH', url: '{{devBaseUrl}}/api/v1/complaints/:id/status', body: { mode: 'raw', raw: '{"status":"RESOLVED","resolutionNote":"Fixed"}' } } },
        { name: 'reopen-complaint', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/complaints/:id/reopen' } },
        { name: 'delete-complaint', request: { method: 'DELETE', url: '{{devBaseUrl}}/api/v1/complaints/:id' } },
        { name: 'search-complaints', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/complaints/search?q=pothole' } },
        { name: 'my-assigned-complaints', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/complaints/my-assigned' } },
        { name: 'assign-complaint', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/complaints/:id/assign', body: { mode: 'raw', raw: '{"staffId":"<UUID>"}' } } },
        { name: 'reassign-complaint', request: { method: 'PATCH', url: '{{devBaseUrl}}/api/v1/assignments/:id/reassign', body: { mode: 'raw', raw: '{"staffId":"<UUID>"}' } } },
      ]
    },
    {
      name: 'Attachments',
      item: [
        { name: 'upload-attachment', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/complaints/:id/attachments', body: { mode: 'formdata', formdata: [{ key: 'file', type: 'file', src: '' }, { key: 'stage', type: 'text', value: 'SUBMISSION' }, { key: 'fileType', type: 'text', value: 'IMAGE' }] } } },
        { name: 'delete-attachment', request: { method: 'DELETE', url: '{{devBaseUrl}}/api/v1/attachments/:id' } },
      ]
    },
    {
      name: 'Feedback',
      item: [
        { name: 'submit-feedback', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/complaints/:id/feedback', body: { mode: 'raw', raw: '{"rating":5,"comment":"Great job"}' } } },
        { name: 'get-feedback', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/complaints/:id/feedback' } },
      ]
    },
    {
      name: 'Payments',
      item: [
        { name: 'initiate-payment', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/payments/initiate', body: { mode: 'raw', raw: '{"complaintId":"<UUID>","purpose":"PRIORITY_FEE"}' } } },
        { name: 'webhook', request: { method: 'POST', url: '{{devBaseUrl}}/api/v1/payments/webhook' } },
        { name: 'get-payment', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/payments/:id' } },
        { name: 'my-payments', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/payments/my-history' } },
      ]
    },
    {
      name: 'Notifications',
      item: [
        { name: 'get-notifications', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/notifications' } },
        { name: 'mark-read', request: { method: 'PATCH', url: '{{devBaseUrl}}/api/v1/notifications/:id/read' } },
      ]
    },
    {
      name: 'Admin & Stats',
      item: [
        { name: 'get-public-stats', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/public/stats' } },
        { name: 'get-dashboard-stats', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/admin/dashboard-stats' } },
        { name: 'get-audit-logs', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/admin/audit-logs' } },
        { name: 'get-users', request: { method: 'GET', url: '{{devBaseUrl}}/api/v1/admin/users' } },
        { name: 'change-user-role', request: { method: 'PATCH', url: '{{devBaseUrl}}/api/v1/admin/users/:id/role', body: { mode: 'raw', raw: '{"role":"STAFF","departmentId":"<UUID>","employeeCode":"EMP123"}' } } },
        { name: 'deactivate-user', request: { method: 'PATCH', url: '{{devBaseUrl}}/api/v1/admin/users/:id/deactivate', body: { mode: 'raw', raw: '{"isActive":false}' } } },
      ]
    }
  ]
};

const formatRequest = (item) => {
  if (item.request && item.request.body && item.request.body.mode === 'raw') {
    item.request.body.options = { raw: { language: 'json' } };
  }
  
  if (item.request && item.request.header === undefined) {
    item.request.header = [];
  }
  
  if (item.item) {
    item.item = item.item.map(formatRequest);
  }
  
  return item;
}

collection.item = collection.item.map(formatRequest);

fs.writeFileSync('DOCS/CityFix-backend.postman_collection.json', JSON.stringify(collection, null, 2));
