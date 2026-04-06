"use client";
import React from "react";

export default function ERDemoPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <h1 className="text-3xl font-bold mb-8 text-green-400">Ephemeral Rollups Demo</h1>
      <div className="grid grid-cols-2 gap-8">
        <div className="border border-gray-700 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-purple-400">Solana L1 (Standard)</h2>
          <p className="text-gray-400 mb-4">Transactions go directly to the base chain.</p>
          <div className="bg-gray-900 p-4 rounded text-sm mb-4">
            Expected Latency: ~400ms - 2s
            <br/>Cost: High
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-bold transition-colors">
            Run L1 Transaction
          </button>
        </div>
        <div className="border border-green-900 p-6 rounded-lg bg-green-900/10">
          <h2 className="text-xl font-bold mb-4 text-green-400">Ephemeral Rollup (Gasless)</h2>
          <p className="text-gray-400 mb-4">State is delegated to MagicBlock Ephemeral Rollup.</p>
          <div className="bg-gray-900 p-4 rounded text-sm mb-4">
            Expected Latency: ~10ms - 50ms
            <br/>Cost: Zero (Gasless)
          </div>
          <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold transition-colors text-black">
            Run ER Transaction
          </button>
        </div>
      </div>
    </div>
  );
}
