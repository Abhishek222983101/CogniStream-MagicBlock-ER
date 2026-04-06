const fs = require('fs');
let code = fs.readFileSync('/home/arch-nitro/Cogni-Stream-Web3/frontend/src/lib/er-client.ts', 'utf8');

const regex = /sendTransactionL1/g;
console.log(code.match(regex).length);
