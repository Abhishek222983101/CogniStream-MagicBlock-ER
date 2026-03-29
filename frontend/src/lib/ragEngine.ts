import { INDIAN_TRIALS, INDIAN_PATIENTS, ClinicalTrial, Patient } from "./clinicalData";

export interface Chunk {
  id: string;
  type: "trial" | "patient";
  title: string;
  content: string;
  metadata: Record<string, any>;
  keywords: string[];
}

export interface RetrievedContext {
  chunk: Chunk;
  score: number;
}

export class ClinicalRAG {
  private chunks: Chunk[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.chunks = [];
    
    for (const trial of INDIAN_TRIALS) {
      const content = this.extractTrialContent(trial);
      this.chunks.push({
        id: `trial-${trial.id}`,
        type: "trial",
        title: `${trial.trialId}: ${trial.title}`,
        content,
        metadata: {
          trialId: trial.trialId,
          phase: trial.phase,
          status: trial.status,
          sponsor: trial.sponsor,
          conditions: trial.conditions,
          locations: trial.locations.map(l => `${l.city}, ${l.state}`),
          minAge: trial.minAge,
          maxAge: trial.maxAge,
          gender: trial.gender,
          ecogMax: trial.ecogMax,
          radiusKm: trial.radiusKm,
          requiredDiagnoses: trial.requiredDiagnoses,
          requiredBiomarkers: trial.requiredBiomarkers,
          requiredStages: trial.requiredStages
        },
        keywords: this.extractKeywords(content)
      });
    }

    for (const patient of INDIAN_PATIENTS) {
      const content = this.extractPatientContent(patient);
      this.chunks.push({
        id: `patient-${patient.id}`,
        type: "patient",
        title: `${patient.id}: ${patient.diagnosis}`,
        content,
        metadata: {
          patientId: patient.id,
          age: patient.age,
          gender: patient.gender,
          city: patient.city,
          state: patient.state,
          diagnosis: patient.diagnosis,
          stage: patient.stage,
          ecogStatus: patient.ecogStatus,
          biomarkers: patient.biomarkers,
          medicalHistory: patient.medicalHistory
        },
        keywords: this.extractKeywords(content)
      });
    }

    this.initialized = true;
    console.log(`RAG initialized with ${this.chunks.length} chunks`);
  }

  private extractTrialContent(trial: ClinicalTrial): string {
    const locations = trial.locations.map(l => 
      `${l.facility} in ${l.city}, ${l.state}`
    ).join("; ");

    const criteria = [
      `Age: ${trial.minAge}-${trial.maxAge} years`,
      `Gender: ${trial.gender}`,
      `ECOG: ${trial.ecogMax} or better`,
      `Radius: ${trial.radiusKm} km`,
      `Required diagnoses: ${trial.requiredDiagnoses.join(", ")}`,
      `Required biomarkers: ${trial.requiredBiomarkers?.join(", ") || "None"}`,
      `Required stages: ${trial.requiredStages?.join(", ") || "Any"}`
    ].join(". ");

    return `
      Trial: ${trial.title}
      NCT ID: ${trial.trialId}
      Phase: ${trial.phase}
      Status: ${trial.status}
      Sponsor: ${trial.sponsor}
      Conditions: ${trial.conditions.join(", ")}
      Locations: ${locations}
      Eligibility: ${criteria}
      Inclusion Criteria: ${trial.inclusionCriteria.join("; ")}
      Exclusion Criteria: ${trial.exclusionCriteria.join("; ")}
    `.trim();
  }

  private extractPatientContent(patient: Patient): string {
    const biomarkers = Object.entries(patient.biomarkers)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    const priorTreatments = patient.priorTreatments
      .map(t => `${t.type}: ${t.name} at ${t.hospital} (${t.date})`)
      .join("; ");

    const medications = patient.medications.join(", ");

    return `
      Patient ID: ${patient.id}
      Demographics: ${patient.age} years old, ${patient.gender}
      Location: ${patient.city}, ${patient.state}
      Diagnosis: ${patient.diagnosis}
      Subtype: ${patient.subtype || "N/A"}
      Stage: ${patient.stage}
      ICD-10: ${patient.icd10 || "N/A"}
      Biomarkers: ${biomarkers || "None"}
      ECOG Status: ${patient.ecogStatus}
      Medical History: ${patient.medicalHistory.join(", ") || "None"}
      Current Medications: ${medications || "None"}
      Prior Treatments: ${priorTreatments || "None"}
      Smoking Status: ${patient.smokingStatus}
      Allergies: ${patient.allergies.join(", ") || "None"}
    `.trim();
  }

  private extractKeywords(text: string): string[] {
    const keywords = new Set<string>();
    const words = text.toLowerCase().split(/\W+/);
    
    const medicalTerms = [
      "cancer", "carcinoma", "tumor", "malignant", "benign",
      "diabetes", "hypertension", "cardiac", "cardiovascular",
      "lung", "breast", "colorectal", "gastric", "ovarian", "pancreatic",
      "nsclc", "sclc", "her2", "egfr", "kras", "brca", "pdl1",
      "chemotherapy", "immunotherapy", "targeted", "radiation",
      "stage", "metastatic", "recurrent", "refractory",
      "ecog", "karnofsky", "performance",
      "creatinine", "hemoglobin", "platelets", "wbc", "liver", "renal",
      "trial", "study", "clinical", "recruiting", "enrollment"
    ];

    for (const word of words) {
      if (word.length > 3 && medicalTerms.some(term => word.includes(term))) {
        keywords.add(word);
      }
    }

    return Array.from(keywords);
  }

  private calculateSimilarity(query: string, chunk: Chunk): number {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\W+/).filter(w => w.length > 2);
    
    let score = 0;

    for (const word of queryWords) {
      if (chunk.content.toLowerCase().includes(word)) {
        score += 1;
      }
      if (chunk.keywords.some(k => k.includes(word) || word.includes(k))) {
        score += 2;
      }
      if (chunk.title.toLowerCase().includes(word)) {
        score += 3;
      }
    }

    const queryDiagnosis = this.extractDiagnosisFromQuery(queryLower);
    if (queryDiagnosis && chunk.metadata.diagnosis) {
      if (chunk.metadata.diagnosis.toLowerCase().includes(queryDiagnosis)) {
        score += 5;
      }
      if (chunk.metadata.conditions?.some((c: string) => c.toLowerCase().includes(queryDiagnosis))) {
        score += 5;
      }
    }

    if (chunk.type === "trial") {
      if (queryLower.includes("patient") || queryLower.includes("eligible")) {
        score += 2;
      }
    } else {
      if (queryLower.includes("trial") || queryLower.includes("study")) {
        score += 2;
      }
    }

    return score;
  }

  private extractDiagnosisFromQuery(query: string): string | null {
    const diagnoses = [
      "lung cancer", "nsclc", "sclc", "non-small cell",
      "breast cancer", "colorectal", "gastric", "ovarian", "pancreatic",
      "hepatocellular", "hcc", "lymphoma", "myeloma", "leukemia",
      "diabetes", "tuberculosis", "tb", "afib", "atrial fibrillation",
      "multiple sclerosis", "lupus", "colitis"
    ];

    for (const d of diagnoses) {
      if (query.includes(d)) {
        return d;
      }
    }
    return null;
  }

  retrieve(query: string, topK: number = 5): RetrievedContext[] {
    const scored = this.chunks.map(chunk => ({
      chunk,
      score: this.calculateSimilarity(query, chunk)
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored
      .filter(s => s.score > 0)
      .slice(0, topK)
      .map(s => ({ chunk: s.chunk, score: s.score }));
  }

  getContextForQuery(query: string): string {
    const retrieved = this.retrieve(query, 5);
    
    if (retrieved.length === 0) {
      return "No specific clinical data found for this query.";
    }

    const context = retrieved.map((r, i) => 
      `[${i + 1}] ${r.chunk.title}\n${r.chunk.content}`
    ).join("\n\n");

    return context;
  }

  getStats(): { trials: number; patients: number; totalChunks: number } {
    const trials = this.chunks.filter(c => c.type === "trial").length;
    const patients = this.chunks.filter(c => c.type === "patient").length;
    return { trials, patients, totalChunks: this.chunks.length };
  }
}

export const ragEngine = new ClinicalRAG();
