const fs = require('fs');
let code = fs.readFileSync('/home/arch-nitro/Cogni-Stream-Web3/frontend/src/lib/er-client.ts', 'utf8');

code = code.replace(
/      if \(isDelegated && this\.programER\) \{\s*const tx = await this\.programER\.methods\s*\.logConsent\(params\.trialId, params\.consentType\)\s*\.accounts\(\{\s*authority: this\.wallet\.publicKey,\s*patientRecord: patientPda,\s*consentLog: consentPda,\s*systemProgram: SystemProgram\.programId,\s*\}\)\s*\.transaction\(\);\s*signature = await this\.sendTransaction\(tx, this\.erConnection\);\s*\} else \{\s*const tx = await this\.programL1\.methods\s*\.logConsent\(params\.trialId, params\.consentType\)\s*\.accounts\(\{\s*authority: this\.wallet\.publicKey,\s*patientRecord: patientPda,\s*consentLog: consentPda,\s*systemProgram: SystemProgram\.programId,\s*\}\)\s*\.transaction\(\);\s*signature = await this\.sendTransactionL1\(tx\);\s*\}/g,
(match) => {
  return `      if (isDelegated && this.programER) {
        const tx = await this.programER.methods
          .logConsent(params.trialId, params.consentType)
          .accounts({
            authority: this.wallet.publicKey,
            patientRecord: patientPda,
            consentLog: consentPda,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
          
        signature = await this.sendTransaction(tx, this.erConnection);
      } else {
        const tx = await this.programL1.methods
          .logConsent(params.trialId, params.consentType)
          .accounts({
            authority: this.wallet.publicKey,
            patientRecord: patientPda,
            consentLog: consentPda,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
          
        signature = await this.sendTransactionL1(tx);
      }`;
}
);

console.log(code.includes("logConsent(params.trialId, params.consentType)"));
