import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Cognistream } from "../target/types/cognistream";
import { assert, expect } from "chai";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as crypto from "crypto";

/**
 * CogniStream Integration Tests
 * 
 * Tests the core functionality of the CogniStream clinical trial matching program:
 * - Patient record initialization
 * - Match result recording
 * - Consent logging and revocation
 * 
 * Note: Delegation tests are limited as they require the MagicBlock delegation
 * program to be available, which is only on devnet.
 */
describe("CogniStream - Clinical Trial Matching on Solana", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Cognistream as Program<Cognistream>;

  // Test wallets
  let owner: Keypair;
  let authority: Keypair;

  // Test data
  const patientId = `ANON_MH_${Date.now()}`;
  const trialId = "NCT05374538";
  const trialId2 = "NCT06789012";

  // PDAs
  let patientPda: PublicKey;
  let patientBump: number;
  let matchPda: PublicKey;
  let matchBump: number;
  let consentPda: PublicKey;
  let consentBump: number;

  // Seeds
  const PATIENT_SEED = Buffer.from("patient");
  const MATCH_SEED = Buffer.from("match");
  const CONSENT_SEED = Buffer.from("consent");

  /**
   * Generate a SHA-256 hash for test data
   */
  function generateDataHash(data: string): number[] {
    const hash = crypto.createHash("sha256").update(data).digest();
    return Array.from(hash);
  }

  before(async () => {
    // Create test wallets
    owner = Keypair.generate();
    authority = Keypair.generate();

    // Airdrop SOL to test wallets
    const ownerAirdrop = await provider.connection.requestAirdrop(
      owner.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(ownerAirdrop, "confirmed");

    const authorityAirdrop = await provider.connection.requestAirdrop(
      authority.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(authorityAirdrop, "confirmed");

    // Derive PDAs
    [patientPda, patientBump] = PublicKey.findProgramAddressSync(
      [PATIENT_SEED, owner.publicKey.toBuffer(), Buffer.from(patientId)],
      program.programId
    );

    console.log("Test Setup Complete:");
    console.log(`  Owner: ${owner.publicKey.toBase58()}`);
    console.log(`  Patient PDA: ${patientPda.toBase58()}`);
    console.log(`  Patient ID: ${patientId}`);
  });

  // ─── Patient Initialization Tests ─────────────────────────────────────────────

  describe("1. Patient Initialization", () => {
    it("initializes a new patient record successfully", async () => {
      const dataHash = generateDataHash(`patient_data_${patientId}`);

      const tx = await program.methods
        .initPatient(patientId, dataHash)
        .accounts({
          owner: owner.publicKey,
          patientRecord: patientPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      console.log(`  ✓ initPatient tx: ${tx}`);

      // Fetch and verify account data
      const patientAccount = await program.account.patientRecord.fetch(patientPda);

      assert.equal(patientAccount.owner.toBase58(), owner.publicKey.toBase58());
      assert.equal(patientAccount.patientId, patientId);
      assert.deepEqual(Array.from(patientAccount.dataHash), dataHash);
      assert.equal(patientAccount.isDelegated, false);
      assert.equal(patientAccount.bump, patientBump);
      assert.ok(patientAccount.createdAt.toNumber() > 0);

      console.log(`  ✓ Patient record verified on-chain`);
    });

    it("fails when patient_id exceeds maximum length (32 chars)", async () => {
      const longPatientId = "A".repeat(40); // 40 chars > 32 limit
      const [longPda] = PublicKey.findProgramAddressSync(
        [PATIENT_SEED, owner.publicKey.toBuffer(), Buffer.from(longPatientId)],
        program.programId
      );
      const dataHash = generateDataHash("test");

      try {
        await program.methods
          .initPatient(longPatientId, dataHash)
          .accounts({
            owner: owner.publicKey,
            patientRecord: longPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Should have thrown PatientIdTooLong error");
      } catch (err: any) {
        expect(err.toString()).to.include("PatientIdTooLong");
        console.log(`  ✓ Correctly rejected long patient_id`);
      }
    });

    it("fails when trying to re-initialize existing patient", async () => {
      const dataHash = generateDataHash("different_data");

      try {
        await program.methods
          .initPatient(patientId, dataHash)
          .accounts({
            owner: owner.publicKey,
            patientRecord: patientPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Should have failed - account already exists");
      } catch (err: any) {
        // Account already exists error from Anchor
        expect(err.toString()).to.include("already in use");
        console.log(`  ✓ Correctly rejected duplicate initialization`);
      }
    });
  });

  // ─── Match Recording Tests ────────────────────────────────────────────────────

  describe("2. Match Recording", () => {
    before(async () => {
      // Derive match PDA
      [matchPda, matchBump] = PublicKey.findProgramAddressSync(
        [MATCH_SEED, patientPda.toBuffer(), Buffer.from(trialId)],
        program.programId
      );
    });

    it("records a match result with valid score", async () => {
      const resultHash = generateDataHash(`match_result_${patientId}_${trialId}`);
      const scoreBps = 8750; // 87.50%

      const tx = await program.methods
        .recordMatch(trialId, resultHash, scoreBps)
        .accounts({
          authority: owner.publicKey,
          patientRecord: patientPda,
          matchResult: matchPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      console.log(`  ✓ recordMatch tx: ${tx}`);

      // Verify match result
      const matchAccount = await program.account.matchResult.fetch(matchPda);

      assert.equal(matchAccount.patientRecord.toBase58(), patientPda.toBase58());
      assert.equal(matchAccount.trialId, trialId);
      assert.deepEqual(Array.from(matchAccount.resultHash), resultHash);
      assert.equal(matchAccount.scoreBps, scoreBps);
      assert.equal(matchAccount.isDelegated, false);
      assert.equal(matchAccount.bump, matchBump);

      console.log(`  ✓ Match result verified: ${scoreBps / 100}% score`);
    });

    it("fails with invalid score > 10000", async () => {
      const [invalidMatchPda] = PublicKey.findProgramAddressSync(
        [MATCH_SEED, patientPda.toBuffer(), Buffer.from(trialId2)],
        program.programId
      );
      const resultHash = generateDataHash("test");
      const invalidScore = 15000; // > 100%

      try {
        await program.methods
          .recordMatch(trialId2, resultHash, invalidScore)
          .accounts({
            authority: owner.publicKey,
            patientRecord: patientPda,
            matchResult: invalidMatchPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Should have thrown InvalidScore error");
      } catch (err: any) {
        expect(err.toString()).to.include("InvalidScore");
        console.log(`  ✓ Correctly rejected invalid score`);
      }
    });

    it("fails with trial_id exceeding max length (20 chars)", async () => {
      const longTrialId = "NCT" + "0".repeat(25); // > 20 chars
      const [longMatchPda] = PublicKey.findProgramAddressSync(
        [MATCH_SEED, patientPda.toBuffer(), Buffer.from(longTrialId)],
        program.programId
      );
      const resultHash = generateDataHash("test");

      try {
        await program.methods
          .recordMatch(longTrialId, resultHash, 5000)
          .accounts({
            authority: owner.publicKey,
            patientRecord: patientPda,
            matchResult: longMatchPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Should have thrown TrialIdTooLong error");
      } catch (err: any) {
        expect(err.toString()).to.include("TrialIdTooLong");
        console.log(`  ✓ Correctly rejected long trial_id`);
      }
    });
  });

  // ─── Consent Management Tests ─────────────────────────────────────────────────

  describe("3. Consent Management", () => {
    before(async () => {
      // Derive consent PDA
      [consentPda, consentBump] = PublicKey.findProgramAddressSync(
        [CONSENT_SEED, patientPda.toBuffer(), Buffer.from(trialId)],
        program.programId
      );
    });

    it("logs consent for a trial", async () => {
      const consentType = 1; // ContactForEnrollment

      const tx = await program.methods
        .logConsent(trialId, consentType)
        .accounts({
          authority: owner.publicKey,
          patientRecord: patientPda,
          consentLog: consentPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      console.log(`  ✓ logConsent tx: ${tx}`);

      // Verify consent log
      const consentAccount = await program.account.consentLog.fetch(consentPda);

      assert.equal(consentAccount.patientRecord.toBase58(), patientPda.toBase58());
      assert.equal(consentAccount.trialId, trialId);
      assert.deepEqual(consentAccount.consentType, { contactForEnrollment: {} });
      assert.equal(consentAccount.isRevoked, false);
      assert.equal(consentAccount.revokedAt.toNumber(), 0);
      assert.equal(consentAccount.bump, consentBump);

      console.log(`  ✓ Consent log verified: ContactForEnrollment`);
    });

    it("fails with invalid consent type > 3", async () => {
      const [invalidConsentPda] = PublicKey.findProgramAddressSync(
        [CONSENT_SEED, patientPda.toBuffer(), Buffer.from(trialId2)],
        program.programId
      );
      const invalidConsentType = 5;

      try {
        await program.methods
          .logConsent(trialId2, invalidConsentType)
          .accounts({
            authority: owner.publicKey,
            patientRecord: patientPda,
            consentLog: invalidConsentPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Should have thrown InvalidConsentType error");
      } catch (err: any) {
        expect(err.toString()).to.include("InvalidConsentType");
        console.log(`  ✓ Correctly rejected invalid consent type`);
      }
    });

    it("revokes consent successfully", async () => {
      const tx = await program.methods
        .revokeConsent()
        .accounts({
          owner: owner.publicKey,
          patientRecord: patientPda,
          consentLog: consentPda,
        })
        .signers([owner])
        .rpc();

      console.log(`  ✓ revokeConsent tx: ${tx}`);

      // Verify revocation
      const consentAccount = await program.account.consentLog.fetch(consentPda);

      assert.equal(consentAccount.isRevoked, true);
      assert.ok(consentAccount.revokedAt.toNumber() > 0);

      console.log(`  ✓ Consent revoked at: ${new Date(consentAccount.revokedAt.toNumber() * 1000).toISOString()}`);
    });

    it("fails when trying to revoke already revoked consent", async () => {
      try {
        await program.methods
          .revokeConsent()
          .accounts({
            owner: owner.publicKey,
            patientRecord: patientPda,
            consentLog: consentPda,
          })
          .signers([owner])
          .rpc();
        assert.fail("Should have thrown AlreadyRevoked error");
      } catch (err: any) {
        expect(err.toString()).to.include("AlreadyRevoked");
        console.log(`  ✓ Correctly rejected double revocation`);
      }
    });
  });

  // ─── Undelegation Tests (Without actual MagicBlock) ───────────────────────────

  describe("4. Undelegation (Simulated)", () => {
    it("fails to undelegate when not delegated", async () => {
      try {
        await program.methods
          .undelegatePatient()
          .accounts({
            owner: owner.publicKey,
            patientRecord: patientPda,
          })
          .signers([owner])
          .rpc();
        assert.fail("Should have thrown NotDelegated error");
      } catch (err: any) {
        expect(err.toString()).to.include("NotDelegated");
        console.log(`  ✓ Correctly rejected undelegation when not delegated`);
      }
    });
  });

  // ─── Authorization Tests ──────────────────────────────────────────────────────

  describe("5. Authorization Checks", () => {
    it("fails when non-owner tries to revoke consent", async () => {
      // First, create a new consent log that isn't revoked
      const newTrialId = "NCT99999999";
      const [newConsentPda] = PublicKey.findProgramAddressSync(
        [CONSENT_SEED, patientPda.toBuffer(), Buffer.from(newTrialId)],
        program.programId
      );

      // Create the consent with owner
      await program.methods
        .logConsent(newTrialId, 0)
        .accounts({
          authority: owner.publicKey,
          patientRecord: patientPda,
          consentLog: newConsentPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      // Try to revoke with different authority
      try {
        await program.methods
          .revokeConsent()
          .accounts({
            owner: authority.publicKey, // Wrong owner!
            patientRecord: patientPda,
            consentLog: newConsentPda,
          })
          .signers([authority])
          .rpc();
        assert.fail("Should have failed with authorization error");
      } catch (err: any) {
        // Anchor's has_one constraint will fail
        expect(err.toString()).to.include("has one constraint");
        console.log(`  ✓ Correctly rejected unauthorized revocation`);
      }
    });
  });

  // ─── Summary ──────────────────────────────────────────────────────────────────

  after(() => {
    console.log("\n" + "═".repeat(60));
    console.log("  CogniStream Test Suite Complete");
    console.log("═".repeat(60));
    console.log(`  Program ID: ${program.programId.toBase58()}`);
    console.log(`  Patient PDA: ${patientPda.toBase58()}`);
    console.log(`  Match PDA: ${matchPda.toBase58()}`);
    console.log(`  Consent PDA: ${consentPda.toBase58()}`);
    console.log("═".repeat(60) + "\n");
  });
});
