/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/cognistream.json`.
 */
export type Cognistream = {
  "address": "3YUtpqBtoJshnq7zWviWFrdWc82pgiDLM9wjfFujGMEg",
  "metadata": {
    "name": "cognistream",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "CogniStream - Privacy-First Clinical Trial Matching on Solana with MagicBlock ER"
  },
  "docs": [
    "CogniStream Program with MagicBlock Ephemeral Rollup support"
  ],
  "instructions": [
    {
      "name": "delegatePatient",
      "docs": [
        "Delegate patient record to Ephemeral Rollup via CPI",
        "",
        "Transfers ownership to MagicBlock's delegation program for gasless,",
        "real-time transactions. The `validator` determines which ER to use."
      ],
      "discriminator": [
        54,
        93,
        83,
        159,
        64,
        145,
        201,
        41
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "patientRecord"
          ]
        },
        {
          "name": "patientRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  116,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "patient_record.patient_id",
                "account": "patientRecord"
              }
            ]
          }
        },
        {
          "name": "validator",
          "optional": true
        },
        {
          "name": "delegationBuffer",
          "writable": true
        },
        {
          "name": "delegationRecord",
          "writable": true
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initPatient",
      "docs": [
        "Initialize a new patient record on the base layer",
        "",
        "Creates a PatientRecord PDA storing the hash of anonymized patient data.",
        "This must be called on L1 before delegation to ER."
      ],
      "discriminator": [
        90,
        145,
        218,
        92,
        140,
        17,
        81,
        5
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "patientRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  116,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "patientId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "patientId",
          "type": "string"
        },
        {
          "name": "dataHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "logConsent",
      "docs": [
        "Log patient consent for a trial",
        "",
        "Creates an immutable audit trail of consent.",
        "On ER, this is gasless."
      ],
      "discriminator": [
        181,
        53,
        137,
        100,
        136,
        190,
        212,
        71
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "patientRecord",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  116,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "patient_record.owner",
                "account": "patientRecord"
              },
              {
                "kind": "account",
                "path": "patient_record.patient_id",
                "account": "patientRecord"
              }
            ]
          }
        },
        {
          "name": "consentLog",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  115,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "patientRecord"
              },
              {
                "kind": "arg",
                "path": "trialId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "trialId",
          "type": "string"
        },
        {
          "name": "consentType",
          "type": "u8"
        }
      ]
    },
    {
      "name": "recordMatch",
      "docs": [
        "Record ML matching result (on ER = gasless!)",
        "",
        "Stores the composite score and hash of full match result JSON.",
        "When called on ER, this is gasless and sub-50ms."
      ],
      "discriminator": [
        148,
        41,
        163,
        203,
        58,
        251,
        192,
        228
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "patientRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  116,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "patient_record.owner",
                "account": "patientRecord"
              },
              {
                "kind": "account",
                "path": "patient_record.patient_id",
                "account": "patientRecord"
              }
            ]
          }
        },
        {
          "name": "matchResult",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "patientRecord"
              },
              {
                "kind": "arg",
                "path": "trialId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "trialId",
          "type": "string"
        },
        {
          "name": "resultHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "scoreBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "revokeConsent",
      "docs": [
        "Revoke previously granted consent"
      ],
      "discriminator": [
        36,
        0,
        100,
        148,
        132,
        131,
        112,
        76
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "patientRecord"
          ]
        },
        {
          "name": "patientRecord",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  116,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "patient_record.patient_id",
                "account": "patientRecord"
              }
            ]
          }
        },
        {
          "name": "consentLog",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  115,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "patientRecord"
              },
              {
                "kind": "account",
                "path": "consent_log.trial_id",
                "account": "consentLog"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "undelegatePatient",
      "docs": [
        "Undelegate patient record from ER",
        "",
        "Commits final state and returns account ownership to L1."
      ],
      "discriminator": [
        79,
        8,
        4,
        212,
        135,
        62,
        193,
        189
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "patientRecord"
          ]
        },
        {
          "name": "patientRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  116,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "patient_record.patient_id",
                "account": "patientRecord"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "undelegationCallback",
      "docs": [
        "Undelegation callback - called by delegation program to finalize undelegation",
        "Discriminator: [196, 28, 41, 206, 48, 37, 51, 167]"
      ],
      "discriminator": [
        2,
        50,
        40,
        175,
        46,
        98,
        180,
        165
      ],
      "accounts": [
        {
          "name": "delegationProgram",
          "signer": true
        },
        {
          "name": "patientRecord",
          "writable": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "consentLog",
      "discriminator": [
        212,
        186,
        55,
        88,
        109,
        96,
        69,
        4
      ]
    },
    {
      "name": "matchResult",
      "discriminator": [
        234,
        166,
        33,
        250,
        153,
        92,
        223,
        196
      ]
    },
    {
      "name": "patientRecord",
      "discriminator": [
        66,
        65,
        121,
        175,
        222,
        160,
        195,
        11
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "patientIdTooLong",
      "msg": "Patient ID exceeds maximum length of 32 characters"
    },
    {
      "code": 6001,
      "name": "patientAlreadyExists",
      "msg": "Patient record already exists"
    },
    {
      "code": 6002,
      "name": "patientNotFound",
      "msg": "Patient record not found"
    },
    {
      "code": 6003,
      "name": "unauthorizedPatientAccess",
      "msg": "Not authorized to access this patient record"
    },
    {
      "code": 6004,
      "name": "trialIdTooLong",
      "msg": "Trial ID exceeds maximum length of 20 characters"
    },
    {
      "code": 6005,
      "name": "matchAlreadyRecorded",
      "msg": "Match result already recorded for this patient-trial pair"
    },
    {
      "code": 6006,
      "name": "invalidScore",
      "msg": "Invalid score - must be between 0 and 10000 (basis points)"
    },
    {
      "code": 6007,
      "name": "matchNotFound",
      "msg": "Match result not found"
    },
    {
      "code": 6008,
      "name": "consentAlreadyLogged",
      "msg": "Consent already logged for this patient-trial pair"
    },
    {
      "code": 6009,
      "name": "alreadyRevoked",
      "msg": "Consent has already been revoked"
    },
    {
      "code": 6010,
      "name": "invalidConsentType",
      "msg": "Invalid consent type - must be 0-3"
    },
    {
      "code": 6011,
      "name": "alreadyDelegated",
      "msg": "Account is already delegated to Ephemeral Rollup"
    },
    {
      "code": 6012,
      "name": "notDelegated",
      "msg": "Account is not delegated - cannot perform ER operation"
    },
    {
      "code": 6013,
      "name": "invalidValidator",
      "msg": "Invalid validator pubkey for delegation"
    },
    {
      "code": 6014,
      "name": "delegationFailed",
      "msg": "Delegation failed - see logs for details"
    },
    {
      "code": 6015,
      "name": "undelegationFailed",
      "msg": "Undelegation failed - see logs for details"
    },
    {
      "code": 6016,
      "name": "permissionDenied",
      "msg": "Permission denied - not a member of this permission group"
    },
    {
      "code": 6017,
      "name": "permissionNotFound",
      "msg": "Permission account not found"
    },
    {
      "code": 6018,
      "name": "invalidPermissionFlags",
      "msg": "Invalid permission flags"
    },
    {
      "code": 6019,
      "name": "invalidDataHash",
      "msg": "Invalid data hash - must be exactly 32 bytes"
    },
    {
      "code": 6020,
      "name": "invalidTimestamp",
      "msg": "Timestamp is invalid or in the future"
    },
    {
      "code": 6021,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow occurred"
    },
    {
      "code": 6022,
      "name": "corruptedData",
      "msg": "Account data is corrupted"
    }
  ],
  "types": [
    {
      "name": "consentLog",
      "docs": [
        "ConsentLog PDA - immutable audit trail of patient consent",
        "Seeds: [b\"consent\", patient_record.key(), trial_id.as_bytes()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "patientRecord",
            "docs": [
              "Reference to the patient record PDA"
            ],
            "type": "pubkey"
          },
          {
            "name": "trialId",
            "docs": [
              "Clinical trial ID this consent applies to"
            ],
            "type": "string"
          },
          {
            "name": "consentType",
            "docs": [
              "Type of consent granted"
            ],
            "type": {
              "defined": {
                "name": "consentType"
              }
            }
          },
          {
            "name": "consentedAt",
            "docs": [
              "Unix timestamp when consent was logged"
            ],
            "type": "i64"
          },
          {
            "name": "isRevoked",
            "docs": [
              "Whether consent has been revoked"
            ],
            "type": "bool"
          },
          {
            "name": "revokedAt",
            "docs": [
              "Unix timestamp when consent was revoked (0 if not revoked)"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "consentType",
      "docs": [
        "Types of consent a patient can grant"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "viewResults"
          },
          {
            "name": "contactForEnrollment"
          },
          {
            "name": "shareWithCoordinator"
          },
          {
            "name": "fullParticipation"
          }
        ]
      }
    },
    {
      "name": "matchResult",
      "docs": [
        "MatchResult PDA - stores ML matching results on-chain",
        "Seeds: [b\"match\", patient_record.key(), trial_id.as_bytes()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "patientRecord",
            "docs": [
              "Reference to the patient record PDA"
            ],
            "type": "pubkey"
          },
          {
            "name": "trialId",
            "docs": [
              "Clinical trial ID (e.g., \"NCT05374538\")"
            ],
            "type": "string"
          },
          {
            "name": "resultHash",
            "docs": [
              "SHA-256 hash of the full match result JSON (stored off-chain)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "scoreBps",
            "docs": [
              "Composite match score (0-10000, representing 0.00-100.00%)"
            ],
            "type": "u16"
          },
          {
            "name": "isDelegated",
            "docs": [
              "Whether this account is currently delegated to ER"
            ],
            "type": "bool"
          },
          {
            "name": "matchedAt",
            "docs": [
              "Unix timestamp when match was recorded"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "patientRecord",
      "docs": [
        "PatientRecord PDA - stores hashed patient data reference",
        "Seeds: [b\"patient\", owner.key(), patient_id.as_bytes()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "Owner wallet that created this record"
            ],
            "type": "pubkey"
          },
          {
            "name": "patientId",
            "docs": [
              "Unique patient identifier (e.g., \"ANON_MH_0024\")"
            ],
            "type": "string"
          },
          {
            "name": "dataHash",
            "docs": [
              "SHA-256 hash of the anonymized patient data (stored off-chain)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "isDelegated",
            "docs": [
              "Whether this account is currently delegated to ER"
            ],
            "type": "bool"
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp when record was created"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ]
};
