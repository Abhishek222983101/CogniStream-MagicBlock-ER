const fs = require('fs');
let code = fs.readFileSync('er-client.ts', 'utf8');

// The bug in recordMatch:
code = code.replace(
/      const tx = await this\.programL1\.methods[\s\S]*?const signature = await this\.sendTransactionL1\(tx\);/g,
(match, offset, str) => {
  if (match.includes("recordMatch")) {
    return `      let signature: string;
      if (isDelegated && this.programER) {
        const tx = await this.programER.methods
          .recordMatch(params.trialId, resultHash as number[], params.scoreBps)
          .accounts({
            authority: this.wallet.publicKey,
            patientRecord: patientPda,
            matchResult: matchPda,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
        signature = await this.sendTransaction(tx, this.erConnection);
      } else {
        const tx = await this.programL1.methods
          .recordMatch(params.trialId, resultHash as number[], params.scoreBps)
          .accounts({
            authority: this.wallet.publicKey,
            patientRecord: patientPda,
            matchResult: matchPda,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
        signature = await this.sendTransactionL1(tx);
      }`;
  }
  return match;
});

fs.writeFileSync('er-client.ts', code);
