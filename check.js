const fs = require('fs');
const d = JSON.parse(fs.readFileSync('data/db.json', 'utf8'));
d.users.forEach(u => console.log(u.id, u.email, u.role, u.passwordHash.slice(0, 20)));
EOF
node check.js