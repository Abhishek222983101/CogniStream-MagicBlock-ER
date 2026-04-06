"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  CheckCircle,
  Loader2,
  X,
  ExternalLink,
  Building2,
  User,
  Stethoscope,
  Lock,
  Sparkles,
  Fingerprint,
  ArrowRight,
} from "lucide-react";
import {
  HEALTHCARE_PROVIDERS,
  HealthcareProviderId,
  generateZKProof,
  ProofGenerationState,
  ZKProofData,
  storeProofInSession,
  getProviderName,
} from "@/lib/reclaim-client";

interface VerifyWithReclaimProps {
  diagnosis?: string;
  patientAge?: number;
  patientGender?: string;
  patientCity?: string;
  onVerified?: (proofData: ZKProofData) => void;
  compact?: boolean;
}

export function VerifyWithReclaim({
  diagnosis,
  patientAge,
  patientGender,
  patientCity,
  onVerified,
  compact = false,
}: VerifyWithReclaimProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<HealthcareProviderId | null>(null);
  const [proofState, setProofState] = useState<ProofGenerationState | null>(null);
  const [verifiedProof, setVerifiedProof] = useState<ZKProofData | null>(null);

  const handleStartVerification = useCallback(async () => {
    if (!selectedProvider || !diagnosis) return;

    setProofState({
      status: "connecting",
      progress: 0,
      message: "Initializing verification...",
    });

    try {
      const result = await generateZKProof(
        selectedProvider,
        {
          diagnosis,
          age: patientAge,
          gender: patientGender,
          city: patientCity,
        },
        (state) => setProofState(state)
      );

      if (result.success && result.proofData) {
        setVerifiedProof(result.proofData);
        storeProofInSession(result.proofData);
        onVerified?.(result.proofData);
      } else {
        setProofState({
          status: "error",
          progress: 0,
          message: result.error || "Verification failed",
        });
      }
    } catch (err: any) {
      setProofState({
        status: "error",
        progress: 0,
        message: err.message || "Verification failed",
        error: err.message,
      });
    }
  }, [selectedProvider, diagnosis, patientAge, patientGender, patientCity, onVerified]);

  const resetState = useCallback(() => {
    setSelectedProvider(null);
    setProofState(null);
    setVerifiedProof(null);
  }, []);

  // Compact verified badge
  if (verifiedProof && compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/40 rounded-lg"
      >
        <Shield className="w-4 h-4 text-emerald-600" />
        <span className="font-mono text-xs font-bold text-emerald-700 uppercase">
          ZK Verified
        </span>
        <span className="font-mono text-[10px] text-emerald-600/70">
          {verifiedProof.proofHash.slice(0, 8)}...
        </span>
      </motion.div>
    );
  }

  // If already verified, show badge with details
  if (verifiedProof) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400/50 rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-heading font-black text-sm uppercase text-emerald-800">
                Diagnosis Verified
              </p>
              <p className="font-mono text-[10px] text-emerald-600">
                via {getProviderName(verifiedProof.provider)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-emerald-500/20 rounded text-emerald-700 font-mono text-[10px] font-bold">
              {Math.round(verifiedProof.confidence)}% Confidence
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white/60 rounded-lg p-2 border border-emerald-200">
            <p className="font-mono text-[10px] text-emerald-600/70 uppercase">Proof Hash</p>
            <p className="font-mono text-xs text-emerald-800 truncate">
              {verifiedProof.proofHash.slice(0, 16)}...
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-2 border border-emerald-200">
            <p className="font-mono text-[10px] text-emerald-600/70 uppercase">Category</p>
            <p className="font-mono text-xs text-emerald-800 capitalize">
              {verifiedProof.claimedFields.diagnosisCategory?.replace(/_/g, " ") || "Medical"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-emerald-600/70">
            Verified at {new Date(verifiedProof.claimedFields.verificationTime).toLocaleTimeString()}
          </span>
          <button
            onClick={resetState}
            className="font-mono text-emerald-600 hover:text-emerald-800 underline"
          >
            Re-verify
          </button>
        </div>
      </motion.div>
    );
  }

  // Verification button / trigger
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={!diagnosis}
        className={`
          group flex items-center gap-3 px-4 py-3 
          bg-gradient-to-r from-purple-50 to-indigo-50 
          border-2 border-purple-300/50 rounded-xl
          hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10
          transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <Fingerprint className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <p className="font-heading font-black text-sm uppercase text-purple-800">
            Verify with Reclaim
          </p>
          <p className="font-mono text-[10px] text-purple-600">
            Prove diagnosis with ZK-TLS
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-purple-400 ml-auto group-hover:translate-x-1 transition-transform" />
      </button>
    );
  }

  // Full verification modal/flow
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 border-2 border-purple-300/50 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-white" />
          <span className="font-heading font-black text-white uppercase text-sm">
            ZK-TLS Verification
          </span>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            resetState();
          }}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="p-4">
        {/* Provider Selection */}
        {!proofState && (
          <>
            <p className="font-mono text-xs text-purple-600 mb-4">
              Select your healthcare provider to verify your diagnosis:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {(Object.keys(HEALTHCARE_PROVIDERS) as HealthcareProviderId[]).map((id) => {
                const provider = HEALTHCARE_PROVIDERS[id];
                const isSelected = selectedProvider === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedProvider(id)}
                    className={`
                      p-3 rounded-lg border-2 text-left transition-all
                      ${isSelected 
                        ? "border-purple-500 bg-purple-100 shadow-md" 
                        : "border-purple-200 bg-white hover:border-purple-300"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className={`w-4 h-4 ${isSelected ? "text-purple-600" : "text-purple-400"}`} />
                      <span className={`font-heading font-bold text-xs uppercase ${isSelected ? "text-purple-800" : "text-purple-600"}`}>
                        {provider.name.split(" ")[0]}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-purple-500/70 line-clamp-1">
                      {provider.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Diagnosis Preview */}
            {diagnosis && (
              <div className="bg-purple-100/50 border border-purple-200 rounded-lg p-3 mb-4">
                <p className="font-mono text-[10px] text-purple-500 uppercase mb-1">
                  Diagnosis to Verify
                </p>
                <p className="font-mono text-sm text-purple-800 font-bold">
                  {diagnosis}
                </p>
                {(patientAge || patientGender) && (
                  <p className="font-mono text-xs text-purple-600 mt-1">
                    {patientAge && `Age: ${patientAge}`}
                    {patientAge && patientGender && " | "}
                    {patientGender && `Gender: ${patientGender}`}
                  </p>
                )}
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={handleStartVerification}
              disabled={!selectedProvider || !diagnosis}
              className={`
                w-full flex items-center justify-center gap-2 px-4 py-3
                bg-gradient-to-r from-purple-600 to-indigo-600 
                text-white font-heading font-black uppercase text-sm
                rounded-lg shadow-lg shadow-purple-500/30
                hover:shadow-xl hover:shadow-purple-500/40
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-300
              `}
            >
              <Lock className="w-4 h-4" />
              Generate ZK Proof
            </button>

            {/* Info */}
            <p className="font-mono text-[10px] text-purple-500/70 text-center mt-3">
              Your data is never shared. Only a cryptographic proof is generated.
            </p>
          </>
        )}

        {/* Progress State */}
        {proofState && proofState.status !== "complete" && proofState.status !== "error" && (
          <div className="py-6">
            <div className="flex flex-col items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mb-4"
              >
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </motion.div>

              <p className="font-heading font-black text-sm uppercase text-purple-800 mb-2">
                {proofState.status === "connecting" && "Connecting..."}
                {proofState.status === "authenticating" && "Authenticating..."}
                {proofState.status === "generating" && "Generating Proof..."}
                {proofState.status === "verifying" && "Verifying..."}
              </p>
              
              <p className="font-mono text-xs text-purple-600 mb-4">
                {proofState.message}
              </p>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${proofState.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="font-mono text-[10px] text-purple-500 mt-2">
                {proofState.progress}% complete
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {proofState?.status === "error" && (
          <div className="py-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <p className="font-heading font-black text-sm uppercase text-red-700 mb-2">
              Verification Failed
            </p>
            <p className="font-mono text-xs text-red-600 mb-4">
              {proofState.error || proofState.message}
            </p>
            <button
              onClick={resetState}
              className="px-4 py-2 bg-red-100 text-red-700 font-mono text-sm font-bold rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success State */}
        {proofState?.status === "complete" && proofState.proofData && (
          <div className="py-4">
            <div className="flex flex-col items-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-16 h-16 mb-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </motion.div>
              <p className="font-heading font-black text-sm uppercase text-emerald-700">
                Verification Complete!
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-mono text-emerald-600/70 uppercase text-[10px]">Proof Hash</p>
                  <p className="font-mono text-emerald-800 truncate">
                    {proofState.proofData.proofHash.slice(0, 20)}...
                  </p>
                </div>
                <div>
                  <p className="font-mono text-emerald-600/70 uppercase text-[10px]">Confidence</p>
                  <p className="font-mono text-emerald-800 font-bold">
                    {Math.round(proofState.proofData.confidence)}%
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-heading font-bold uppercase text-sm rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Continue with Verified Data
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default VerifyWithReclaim;
