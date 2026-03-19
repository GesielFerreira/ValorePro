import { verifyDomain } from './src/server/services/reputation/domain-verifier';

async function test() {
    console.log("Checking zema.com:");
    const res = await verifyDomain('zema.com');
    console.log(JSON.stringify(res, null, 2));

    console.log("\nChecking zema.com.br:");
    const res2 = await verifyDomain('zema.com.br');
    console.log(JSON.stringify(res2, null, 2));
}

test().catch(console.error);
