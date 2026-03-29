export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TrialLocation {
  facility: string;
  city: string;
  state: string;
  coordinates: Coordinates;
}

export interface ClinicalTrial {
  id: string;
  trialId: string;
  title: string;
  conditions: string[];
  phase: string;
  status: "Recruiting" | "Not Yet Recruiting" | "Completed" | "Active";
  sponsor: string;
  locations: TrialLocation[];
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  minAge: number;
  maxAge: number;
  gender: "All" | "Male" | "Female";
  requiredDiagnoses: string[];
  requiredStages?: string[];
  requiredBiomarkers?: string[];
  ecogMax: number;
  radiusKm: number;
}

export interface Patient {
  id: string;
  age: number;
  gender: "Male" | "Female";
  city: string;
  state: string;
  coordinates: Coordinates;
  diagnosis: string;
  subtype?: string;
  stage: string;
  icd10?: string;
  biomarkers: Record<string, string>;
  medicalHistory: string[];
  medications: string[];
  priorTreatments: { type: string; name: string; date: string; hospital: string }[];
  labValues: Record<string, number>;
  ecogStatus: number;
  smokingStatus: string;
  allergies: string[];
}

export const INDIAN_TRIALS: ClinicalTrial[] = [
  {
    id: "1",
    trialId: "NCT05278920",
    title: "Osimertinib vs. Platinum-Pemetrexed in EGFR-Mutated NSCLC",
    conditions: ["Non-Small Cell Lung Cancer", "Lung Cancer"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "Tata Memorial Hospital",
    locations: [
      { facility: "Tata Memorial Hospital", city: "Mumbai", state: "Maharashtra", coordinates: { lat: 19.0060, lng: 72.8430 } },
      { facility: "Kokilaben Dhirubhai Ambani Hospital", city: "Mumbai", state: "Maharashtra", coordinates: { lat: 19.0325, lng: 72.8262 } }
    ],
    inclusionCriteria: [
      "Age 18-75Histologically confirmed NSCLC years",
      "",
      "EGFR mutation positive (exon 19 deletion or L858R)",
      "Stage IIIB/IV disease",
      "ECOG performance status 0-1"
    ],
    exclusionCriteria: [
      "Prior systemic therapy for metastatic disease",
      "Brain metastases requiring immediate radiotherapy",
      "Active infections including TB"
    ],
    minAge: 18,
    maxAge: 75,
    gender: "All",
    requiredDiagnoses: ["Non-Small Cell Lung Cancer", "Lung Cancer"],
    requiredStages: ["IIIB", "IV"],
    requiredBiomarkers: ["EGFR"],
    ecogMax: 1,
    radiusKm: 100
  },
  {
    id: "2",
    trialId: "NCT05341250",
    title: "Pembrolizumab + Chemotherapy in Advanced NSCLC",
    conditions: ["Non-Small Cell Lung Cancer"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "All India Institute of Medical Sciences",
    locations: [
      { facility: "AIIMS", city: "New Delhi", state: "Delhi", coordinates: { lat: 28.5672, lng: 77.2100 } },
      { facility: "AIIMS", city: "Bhopal", state: "Madhya Pradesh", coordinates: { lat: 23.2599, lng: 77.4126 } }
    ],
    inclusionCriteria: [
      "Age 18-80 years",
      "Histologically confirmed Stage III/IV NSCLC",
      "PD-L1 TPS >= 1%",
      "No prior immunotherapy"
    ],
    exclusionCriteria: [
      "Prior immunotherapy for any cancer",
      "Autoimmune disease requiring steroids",
      "HIV or Hepatitis B/C"
    ],
    minAge: 18,
    maxAge: 80,
    gender: "All",
    requiredDiagnoses: ["Non-Small Cell Lung Cancer"],
    requiredStages: ["III", "IV"],
    requiredBiomarkers: ["PD-L1"],
    ecogMax: 1,
    radiusKm: 150
  },
  {
    id: "3",
    trialId: "NCT05182980",
    title: "Novel EGFR TKI for Resistant Mutations",
    conditions: ["Non-Small Cell Lung Cancer"],
    phase: "Phase 1",
    status: "Recruiting",
    sponsor: "Christian Medical College Vellore",
    locations: [
      { facility: "CMC Vellore", city: "Vellore", state: "Tamil Nadu", coordinates: { lat: 12.9325, lng: 79.1328 } }
    ],
    inclusionCriteria: [
      "Age 18-85 years",
      "Confirmed EGFR-mutated NSCLC",
      "Progression on prior EGFR TKI",
      "At least one measurable lesion"
    ],
    exclusionCriteria: [
      "Prior TKI treatment within 7 days",
      "Uncontrolled brain metastases",
      "Severe cardiac disease"
    ],
    minAge: 18,
    maxAge: 85,
    gender: "All",
    requiredDiagnoses: ["Non-Small Cell Lung Cancer"],
    requiredBiomarkers: ["EGFR"],
    ecogMax: 2,
    radiusKm: 200
  },
  {
    id: "4",
    trialId: "NCT05432190",
    title: "Trastuzumab Deruxtecan in HER2+ Breast Cancer",
    conditions: ["Breast Cancer", "HER2 Positive Breast Cancer"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "National Cancer Institute Delhi",
    locations: [
      { facility: "NCI Delhi", city: "New Delhi", state: "Delhi", coordinates: { lat: 28.6139, lng: 77.2090 } },
      { facility: "Rajiv Gandhi Cancer Institute", city: "New Delhi", state: "Delhi", coordinates: { lat: 28.6518, lng: 77.2389 } }
    ],
    inclusionCriteria: [
      "Age 18-75 years",
      "Histologically confirmed HER2+ breast cancer",
      "Stage IV or recurrent disease",
      "Prior trastuzumab treatment"
    ],
    exclusionCriteria: [
      "Prior T-DM1 or ADC therapy",
      "Active brain metastases",
      "LVEF < 50%"
    ],
    minAge: 18,
    maxAge: 75,
    gender: "Female",
    requiredDiagnoses: ["Breast Cancer"],
    requiredBiomarkers: ["HER2"],
    ecogMax: 1,
    radiusKm: 100
  },
  {
    id: "5",
    trialId: "NCT05362010",
    title: "CDK4/6 Inhibitor in HR+ Breast Cancer",
    conditions: ["Breast Cancer", "HR Positive Breast Cancer"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "Kidwai Memorial Institute of Oncology",
    locations: [
      { facility: "Kidwai Cancer Institute", city: "Bangalore", state: "Karnataka", coordinates: { lat: 12.9230, lng: 77.5960 } }
    ],
    inclusionCriteria: [
      "Age 18-80 years",
      "HR+/HER2- metastatic breast cancer",
      "ECOG 0-2",
      "At least one measurable lesion"
    ],
    exclusionCriteria: [
      "Prior CDK4/6 inhibitor",
      "Active liver metastases",
      "Severe liver dysfunction"
    ],
    minAge: 18,
    maxAge: 80,
    gender: "Female",
    requiredDiagnoses: ["Breast Cancer"],
    ecogMax: 2,
    radiusKm: 150
  },
  {
    id: "6",
    trialId: "NCT05245680",
    title: "Metformin + Chemotherapy in Metastatic Colorectal Cancer",
    conditions: ["Colorectal Cancer", "Colon Cancer"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "Gujarat Cancer & Research Institute",
    locations: [
      { facility: "GCRI", city: "Ahmedabad", state: "Gujarat", coordinates: { lat: 23.0339, lng: 72.5858 } }
    ],
    inclusionCriteria: [
      "Age 18-75 years",
      "Histologically confirmed metastatic colorectal cancer",
      "KRAS wild-type",
      "No prior systemic chemotherapy for metastatic disease"
    ],
    exclusionCriteria: [
      "Prior anti-EGFR or anti-VEGF therapy",
      "Active GI bleeding",
      "Pregnancy"
    ],
    minAge: 18,
    maxAge: 75,
    gender: "All",
    requiredDiagnoses: ["Colorectal Cancer", "Colon Cancer"],
    requiredBiomarkers: ["KRAS"],
    ecogMax: 1,
    radiusKm: 120
  },
  {
    id: "7",
    trialId: "NCT05410890",
    title: "Immunotherapy in Advanced Gastric Cancer",
    conditions: ["Gastric Cancer", "Stomach Cancer"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "Max Healthcare",
    locations: [
      { facility: "Max Super Speciality Hospital", city: "New Delhi", state: "Delhi", coordinates: { lat: 28.5820, lng: 77.1030 } },
      { facility: "Max Hospital", city: " Gurgaon", state: "Haryana", coordinates: { lat: 28.4595, lng: 77.0266 } }
    ],
    inclusionCriteria: [
      "Age 18-75 years",
      "Advanced or metastatic gastric adenocarcinoma",
      "HER2 negative",
      "ECOG 0-1"
    ],
    exclusionCriteria: [
      "Prior immunotherapy",
      "Active autoimmune disease",
      "Hepatitis B/C"
    ],
    minAge: 18,
    maxAge: 75,
    gender: "All",
    requiredDiagnoses: ["Gastric Cancer", "Stomach Cancer"],
    ecogMax: 1,
    radiusKm: 100
  },
  {
    id: "8",
    trialId: "NCT05389010",
    title: "SBRT + Immunotherapy in Early Stage Lung Cancer",
    conditions: ["Lung Cancer", "Non-Small Cell Lung Cancer"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "Apollo Hospitals",
    locations: [
      { facility: "Apollo Cancer Centre", city: "Chennai", state: "Tamil Nadu", coordinates: { lat: 13.0827, lng: 80.2707 } },
      { facility: "Apollo Hospital", city: "Hyderabad", state: "Telangana", coordinates: { lat: 17.4486, lng: 78.3912 } }
    ],
    inclusionCriteria: [
      "Age 18-80 years",
      "Stage I-II NSCLC",
      "Tumor size <= 5cm",
      "Not suitable for surgery"
    ],
    exclusionCriteria: [
      "Prior thoracic radiation",
      "Interstitial lung disease",
      "Severe COPD"
    ],
    minAge: 18,
    maxAge: 80,
    gender: "All",
    requiredDiagnoses: ["Non-Small Cell Lung Cancer"],
    requiredStages: ["I", "II"],
    ecogMax: 2,
    radiusKm: 150
  },
  {
    id: "9",
    trialId: "NCT05299020",
    title: "Bevacizumab + Chemotherapy in Ovarian Cancer",
    conditions: ["Ovarian Cancer"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "Sanjay Gandhi Postgraduate Institute",
    locations: [
      { facility: "SGPGI", city: "Lucknow", state: "Uttar Pradesh", coordinates: { lat: 26.8467, lng: 80.9462 } }
    ],
    inclusionCriteria: [
      "Age 18-75 years",
      "Stage III-IV epithelial ovarian cancer",
      "Naive to anti-VEGF therapy",
      "ECOG 0-2"
    ],
    exclusionCriteria: [
      "Prior anti-VEGF therapy",
      "Bowel obstruction",
      "Active bleeding"
    ],
    minAge: 18,
    maxAge: 75,
    gender: "Female",
    requiredDiagnoses: ["Ovarian Cancer"],
    requiredStages: ["III", "IV"],
    ecogMax: 2,
    radiusKm: 180
  },
  {
    id: "10",
    trialId: "NCT05421010",
    title: "CAR-T Cell Therapy in Relapsed Lymphoma",
    conditions: ["Lymphoma", "Diffuse Large B-Cell Lymphoma"],
    phase: "Phase 1",
    status: "Not Yet Recruiting",
    sponsor: "Narayana Health",
    locations: [
      { facility: "Narayana Cancer Centre", city: "Bangalore", state: "Karnataka", coordinates: { lat: 12.9716, lng: 77.5946 } }
    ],
    inclusionCriteria: [
      "Age 18-70 years",
      "Relapsed or refractory DLBCL",
      "At least 2 prior lines of therapy",
      "ECOG 0-1"
    ],
    exclusionCriteria: [
      "Active CNS involvement",
      "Prior CAR-T therapy",
      "Severe infections"
    ],
    minAge: 18,
    maxAge: 70,
    gender: "All",
    requiredDiagnoses: ["Lymphoma", "Diffuse Large B-Cell Lymphoma"],
    ecogMax: 1,
    radiusKm: 200
  },
  {
    id: "11",
    trialId: "NCT05351020",
    title: "Sofosbuvir + Velpatasvir in Hepatitis C",
    conditions: ["Hepatitis C", "Chronic Hepatitis C"],
    phase: "Phase 4",
    status: "Recruiting",
    sponsor: "Institute of Liver and Biliary Sciences",
    locations: [
      { facility: "ILBS", city: "New Delhi", state: "Delhi", coordinates: { lat: 28.6518, lng: 77.3189 } }
    ],
    inclusionCriteria: [
      "Age 18-65 years",
      "Chronic HCV infection",
      "Cirrhosis or F3-F4 fibrosis",
      "No previous DAA treatment"
    ],
    exclusionCriteria: [
      "HBV co-infection",
      "HIV co-infection",
      "Pregnancy"
    ],
    minAge: 18,
    maxAge: 65,
    gender: "All",
    requiredDiagnoses: ["Hepatitis C"],
    ecogMax: 2,
    radiusKm: 100
  },
  {
    id: "12",
    trialId: "NCT05412010",
    title: "SGLT2 Inhibitor in Diabetic Kidney Disease",
    conditions: ["Type 2 Diabetes", "Diabetic Kidney Disease"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "PGIMER",
    locations: [
      { facility: "PGIMER", city: "Chandigarh", state: "Punjab", coordinates: { lat: 30.7640, lng: 76.7685 } }
    ],
    inclusionCriteria: [
      "Age 25-70 years",
      "Type 2 diabetes with CKD stage 3-4",
      "eGFR 30-89",
      "UACR >= 300 mg/g"
    ],
    exclusionCriteria: [
      "Type 1 diabetes",
      "eGFR < 30",
      "Recent酮酸中毒"
    ],
    minAge: 25,
    maxAge: 70,
    gender: "All",
    requiredDiagnoses: ["Type 2 Diabetes"],
    ecogMax: 2,
    radiusKm: 150
  },
  {
    id: "13",
    trialId: "NCT05381020",
    title: "Novel TB Drug in Drug-Resistant Tuberculosis",
    conditions: ["Tuberculosis", "Multi-Drug Resistant TB"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "National TB Institute Bangalore",
    locations: [
      { facility: "NTI Bangalore", city: "Bangalore", state: "Karnataka", coordinates: { lat: 13.0106, lng: 77.5717 } }
    ],
    inclusionCriteria: [
      "Age 18-65 years",
      "Confirmed MDR-TB",
      "Resistance to at least isoniazid and rifampicin",
      "No prior bedaquiline or delamanid"
    ],
    exclusionCriteria: [
      "Extensively drug-resistant TB",
      "Pregnancy",
      "Severe liver disease"
    ],
    minAge: 18,
    maxAge: 65,
    gender: "All",
    requiredDiagnoses: ["Tuberculosis"],
    ecogMax: 2,
    radiusKm: 200
  },
  {
    id: "14",
    trialId: "NCT05251020",
    title: "PCI in Stable Coronary Artery Disease",
    conditions: ["Coronary Artery Disease", "Stable Angina"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "Fortis Escorts Heart Institute",
    locations: [
      { facility: "FEHI", city: "New Delhi", state: "Delhi", coordinates: { lat: 28.5662, lng: 77.2751 } }
    ],
    inclusionCriteria: [
      "Age 35-80 years",
      "Stable CAD with significant stenosis",
      "Documented ischemia",
      "Suitable for PCI"
    ],
    exclusionCriteria: [
      "Acute MI within 30 days",
      "Uncontrolled diabetes",
      "Severe renal failure"
    ],
    minAge: 35,
    maxAge: 80,
    gender: "All",
    requiredDiagnoses: ["Coronary Artery Disease"],
    ecogMax: 2,
    radiusKm: 100
  },
  {
    id: "15",
    trialId: "NCT05441020",
    title: "Biodegradable Stent in Peripheral Artery Disease",
    conditions: ["Peripheral Artery Disease"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "SCTIMST",
    locations: [
      { facility: "SCTIMST", city: "Thiruvananthapuram", state: "Kerala", coordinates: { lat: 8.5241, lng: 76.9365 } }
    ],
    inclusionCriteria: [
      "Age 40-75 years",
      "Symptomatic PAD with lifestyle-limiting claudication",
      "Suitable lesion for stenting",
      "ABI < 0.9"
    ],
    exclusionCriteria: [
      "Acute limb ischemia",
      "Severe renal impairment",
      "Bleeding disorders"
    ],
    minAge: 40,
    maxAge: 75,
    gender: "All",
    requiredDiagnoses: ["Peripheral Artery Disease"],
    ecogMax: 2,
    radiusKm: 180
  },
  {
    id: "16",
    trialId: "NCT05512340",
    title: "Atezolizumab in Extensive-Stage SCLC",
    conditions: ["Small Cell Lung Cancer"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "Tata Memorial Hospital",
    locations: [
      { facility: "Tata Memorial Hospital", city: "Mumbai", state: "Maharashtra", coordinates: { lat: 19.0060, lng: 72.8430 } }
    ],
    inclusionCriteria: [
      "Age 18-75 years",
      "Histologically confirmed extensive-stage SCLC",
      "ECOG 0-1",
      "At least one measurable lesion"
    ],
    exclusionCriteria: [
      "Prior systemic therapy for SCLC",
      "Autoimmune disease",
      "Symptomatic brain metastases"
    ],
    minAge: 18,
    maxAge: 75,
    gender: "All",
    requiredDiagnoses: ["Small Cell Lung Cancer"],
    requiredStages: ["ES-SCLC", "Extensive"],
    ecogMax: 1,
    radiusKm: 150
  },
  {
    id: "17",
    trialId: "NCT05523450",
    title: "Nivolumab + Ipilimumab in Hepatocellular Carcinoma",
    conditions: ["Hepatocellular Carcinoma", "Liver Cancer"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "SGPGIMS",
    locations: [
      { facility: "SGPGIMS", city: "Lucknow", state: "Uttar Pradesh", coordinates: { lat: 26.8467, lng: 80.9462 } }
    ],
    inclusionCriteria: [
      "Age 18-75 years",
      "BCLC Stage B or C HCC",
      "Child-Pugh Class A",
      "Confirmed HBV/HCV"
    ],
    exclusionCriteria: [
      "Prior immunotherapy",
      "Portal vein thrombosis",
      "Prior liver transplant"
    ],
    minAge: 18,
    maxAge: 75,
    gender: "All",
    requiredDiagnoses: ["Hepatocellular Carcinoma", "Liver Cancer"],
    requiredStages: ["BCLC B", "BCLC C"],
    ecogMax: 1,
    radiusKm: 200
  },
  {
    id: "18",
    trialId: "NCT05534560",
    title: "Dabigatran vs Warfarin in NVAF",
    conditions: ["Atrial Fibrillation"],
    phase: "Phase 4",
    status: "Recruiting",
    sponsor: "AIIMS",
    locations: [
      { facility: "AIIMS", city: "New Delhi", state: "Delhi", coordinates: { lat: 28.5672, lng: 77.2100 } },
      { facility: "PGIMER", city: "Chandigarh", state: "Punjab", coordinates: { lat: 30.7333, lng: 76.7794 } }
    ],
    inclusionCriteria: [
      "Age 18-80 years",
      "Non-valvular AF with CHA2DS2-VASc >= 2",
      "No prior anticoagulation or warfarin failure"
    ],
    exclusionCriteria: [
      "Mechanical heart valve",
      "Severe renal impairment",
      "Active bleeding"
    ],
    minAge: 18,
    maxAge: 80,
    gender: "All",
    requiredDiagnoses: ["Atrial Fibrillation"],
    ecogMax: 2,
    radiusKm: 180
  },
  {
    id: "19",
    trialId: "NCT05545670",
    title: "Empagliflozin in Diabetic Kidney Disease",
    conditions: ["Type 2 Diabetes", "Diabetic Nephropathy"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "Christian Medical College Vellore",
    locations: [
      { facility: "CMC Vellore", city: "Vellore", state: "Tamil Nadu", coordinates: { lat: 12.9325, lng: 79.1328 } }
    ],
    inclusionCriteria: [
      "Age 25-70 years",
      "Type 2 Diabetes with CKD Stage 3-4",
      "eGFR 30-90 ml/min/1.73m2",
      "UACR > 300 mg/g"
    ],
    exclusionCriteria: [
      "Type 1 Diabetes",
      "Recent DKA",
      "Pregnancy"
    ],
    minAge: 25,
    maxAge: 70,
    gender: "All",
    requiredDiagnoses: ["Type 2 Diabetes", "Diabetic Nephropathy"],
    requiredBiomarkers: ["eGFR"],
    ecogMax: 2,
    radiusKm: 200
  },
  {
    id: "20",
    trialId: "NCT05556780",
    title: "Bedaquiline + Delamanid in Drug-Resistant TB",
    conditions: ["Tuberculosis", " MDR-TB"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "National TB Institute Bangalore",
    locations: [
      { facility: "NTI Bangalore", city: "Bangalore", state: "Karnataka", coordinates: { lat: 12.9716, lng: 77.5946 } }
    ],
    inclusionCriteria: [
      "Age 18-65 years",
      "Confirmed MDR-TB",
      "No prior bedaquiline or delamanid",
      "Sputum positive"
    ],
    exclusionCriteria: [
      "XDR-TB",
      "HIV with CD4 < 50",
      "Severe liver disease"
    ],
    minAge: 18,
    maxAge: 65,
    gender: "All",
    requiredDiagnoses: ["Tuberculosis", "MDR-TB"],
    ecogMax: 2,
    radiusKm: 250
  },
  {
    id: "21",
    trialId: "NCT05567890",
    title: "Rituximab + Chemotherapy in DLBCL",
    conditions: ["Diffuse Large B-Cell Lymphoma"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "Tata Medical Center",
    locations: [
      { facility: "Tata Medical Center", city: "Kolkata", state: "West Bengal", coordinates: { lat: 22.5726, lng: 88.3639 } }
    ],
    inclusionCriteria: [
      "Age 18-70 years",
      "Newly diagnosed DLBCL",
      "Ann Arbor Stage II-IV",
      "ECOG 0-2"
    ],
    exclusionCriteria: [
      "Prior lymphoma treatment",
      "CNS involvement",
      "HIV positive"
    ],
    minAge: 18,
    maxAge: 70,
    gender: "All",
    requiredDiagnoses: ["Diffuse Large B-Cell Lymphoma"],
    requiredStages: ["II", "III", "IV"],
    ecogMax: 2,
    radiusKm: 180
  },
  {
    id: "22",
    trialId: "NCT05578901",
    title: "Levothyroxine in Subclinical Hypothyroidism",
    conditions: ["Subclinical Hypothyroidism"],
    phase: "Phase 4",
    status: "Recruiting",
    sponsor: "AIIMS",
    locations: [
      { facility: "AIIMS", city: "New Delhi", state: "Delhi", coordinates: { lat: 28.5672, lng: 77.2100 } }
    ],
    inclusionCriteria: [
      "Age 18-60 years",
      "TSH > 10 mIU/L",
      "Normal T4",
      "Symptoms of hypothyroidism"
    ],
    exclusionCriteria: [
      "Pregnancy",
      "Recent iodine contrast",
      "Pituitary disease"
    ],
    minAge: 18,
    maxAge: 60,
    gender: "All",
    requiredDiagnoses: ["Subclinical Hypothyroidism"],
    ecogMax: 2,
    radiusKm: 150
  },
  {
    id: "23",
    trialId: "NCT05589012",
    title: "Sirolimus in Polycystic Kidney Disease",
    conditions: ["Polycystic Kidney Disease"],
    phase: "Phase 2",
    status: "Not Yet Recruiting",
    sponsor: "NIMHANS",
    locations: [
      { facility: "NIMHANS", city: "Bangalore", state: "Karnataka", coordinates: { lat: 12.9436, lng: 77.5965 } }
    ],
    inclusionCriteria: [
      "Age 18-50 years",
      "ADPKD with eGFR > 60",
      "Total kidney volume > 750 mL"
    ],
    exclusionCriteria: [
      "eGFR < 60",
      "Recent renal infection",
      "Pregnancy"
    ],
    minAge: 18,
    maxAge: 50,
    gender: "All",
    requiredDiagnoses: ["Polycystic Kidney Disease"],
    ecogMax: 1,
    radiusKm: 200
  },
  {
    id: "24",
    trialId: "NCT05590123",
    title: "Sotorasib in KRAS G12C Mutant NSCLC",
    conditions: ["Non-Small Cell Lung Cancer"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "Mazumdar Shaw Medical Center",
    locations: [
      { facility: "MSMC", city: "Bangalore", state: "Karnataka", coordinates: { lat: 12.9104, lng: 77.5832 } }
    ],
    inclusionCriteria: [
      "Age 18-80 years",
      "KRAS G12C mutation confirmed",
      "Prior platinum-based chemotherapy",
      "At least one measurable lesion"
    ],
    exclusionCriteria: [
      "Prior KRAS inhibitor",
      "Active brain metastases",
      "GI obstruction"
    ],
    minAge: 18,
    maxAge: 80,
    gender: "All",
    requiredDiagnoses: ["Non-Small Cell Lung Cancer"],
    requiredBiomarkers: ["KRAS"],
    ecogMax: 1,
    radiusKm: 180
  },
  {
    id: "25",
    trialId: "NCT05601234",
    title: "Infliximab in Severe Ulcerative Colitis",
    conditions: ["Ulcerative Colitis"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "SGPGIMS",
    locations: [
      { facility: "SGPGIMS", city: "Lucknow", state: "Uttar Pradesh", coordinates: { lat: 26.8467, lng: 80.9462 } }
    ],
    inclusionCriteria: [
      "Age 18-65 years",
      "Moderate-to-severe UC (Mayo >= 6)",
      "Failed conventional therapy",
      "No prior anti-TNF"
    ],
    exclusionCriteria: [
      "Active infection",
      "TB or latent TB",
      "Heart failure"
    ],
    minAge: 18,
    maxAge: 65,
    gender: "All",
    requiredDiagnoses: ["Ulcerative Colitis"],
    ecogMax: 2,
    radiusKm: 200
  },
  {
    id: "26",
    trialId: "NCT05612345",
    title: "Daratumumab in Relapsed Multiple Myeloma",
    conditions: ["Multiple Myeloma"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "Cancer Institute Chennai",
    locations: [
      { facility: "Cancer Institute", city: "Chennai", state: "Tamil Nadu", coordinates: { lat: 13.0569, lng: 80.2775 } }
    ],
    inclusionCriteria: [
      "Age 18-75 years",
      "Relapsed after 1-3 prior lines",
      " measurable disease",
      "ECOG 0-2"
    ],
    exclusionCriteria: [
      "Primary refractory",
      "CNS myeloma",
      "Active infection"
    ],
    minAge: 18,
    maxAge: 75,
    gender: "All",
    requiredDiagnoses: ["Multiple Myeloma"],
    ecogMax: 2,
    radiusKm: 180
  },
  {
    id: "27",
    trialId: "NCT05623456",
    title: "Pentoxifylline in Alcoholic Hepatitis",
    conditions: ["Alcoholic Hepatitis"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "PGIMER",
    locations: [
      { facility: "PGIMER", city: "Chandigarh", state: "Punjab", coordinates: { lat: 30.7333, lng: 76.7794 } }
    ],
    inclusionCriteria: [
      "Age 25-60 years",
      "Alcoholic hepatitis (AUDIT > 15)",
      "Maddrey score 32-50",
      "Recent heavy alcohol use"
    ],
    exclusionCriteria: [
      "Hepatitis B/C",
      "Autoimmune hepatitis",
      "GI bleed"
    ],
    minAge: 25,
    maxAge: 60,
    gender: "All",
    requiredDiagnoses: ["Alcoholic Hepatitis"],
    ecogMax: 2,
    radiusKm: 200
  },
  {
    id: "28",
    trialId: "NCT05634567",
    title: "Ocrelizumab in Primary Progressive MS",
    conditions: ["Multiple Sclerosis"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "NIMHANS",
    locations: [
      { facility: "NIMHANS", city: "Bangalore", state: "Karnataka", coordinates: { lat: 12.9436, lng: 77.5965 } }
    ],
    inclusionCriteria: [
      "Age 18-55 years",
      "PPMS diagnosis < 15 years",
      "EDSS 3.0-6.5",
      "No prior anti-CD20"
    ],
    exclusionCriteria: [
      "RRMS",
      "Active infection",
      "Immunodeficiency"
    ],
    minAge: 18,
    maxAge: 55,
    gender: "All",
    requiredDiagnoses: ["Multiple Sclerosis"],
    ecogMax: 2,
    radiusKm: 200
  },
  {
    id: "29",
    trialId: "NCT05645678",
    title: "Abciximab in Acute Coronary Syndrome",
    conditions: ["Acute Coronary Syndrome"],
    phase: "Phase 3",
    status: "Recruiting",
    sponsor: "AIIMS",
    locations: [
      { facility: "AIIMS", city: "New Delhi", state: "Delhi", coordinates: { lat: 28.5672, lng: 77.2100 } }
    ],
    inclusionCriteria: [
      "Age 18-75 years",
      "NSTEMI or unstable angina",
      "PCI planned within 24 hours",
      "No recent major surgery"
    ],
    exclusionCriteria: [
      "STEMI > 12 hours",
      "Recent stroke",
      "Bleeding diathesis"
    ],
    minAge: 18,
    maxAge: 75,
    gender: "All",
    requiredDiagnoses: ["Acute Coronary Syndrome"],
    ecogMax: 2,
    radiusKm: 150
  },
  {
    id: "30",
    trialId: "NCT05656789",
    title: "Luspatercept in Myelodysplastic Syndrome",
    conditions: ["Myelodysplastic Syndrome"],
    phase: "Phase 2",
    status: "Recruiting",
    sponsor: "Tata Medical Center",
    locations: [
      { facility: "Tata Medical Center", city: "Kolkata", state: "West Bengal", coordinates: { lat: 22.5726, lng: 88.3639 } }
    ],
    inclusionCriteria: [
      "Age 18-80 years",
      "Lower-risk MDS with ring sideroblasts",
      "Transfusion dependent",
      "Failed ESA"
    ],
    exclusionCriteria: [
      "AML",
      "Severe iron overload",
      "Active infection"
    ],
    minAge: 18,
    maxAge: 80,
    gender: "All",
    requiredDiagnoses: ["Myelodysplastic Syndrome"],
    ecogMax: 2,
    radiusKm: 180
  }
];

export const INDIAN_PATIENTS: Patient[] = [
  {
    id: "ANON_MH_001",
    age: 54,
    gender: "Male",
    city: "Mumbai",
    state: "Maharashtra",
    coordinates: { lat: 19.0760, lng: 72.8777 },
    diagnosis: "Non-Small Cell Lung Cancer",
    subtype: "Adenocarcinoma",
    stage: "Stage IV",
    icd10: "C34.1",
    biomarkers: { EGFR: "Exon 19 Deletion", PDL1: "TPS 65%", ALK: "Negative" },
    medicalHistory: ["Type 2 Diabetes", "Hypertension"],
    medications: ["Metformin 500mg BD", "Amlodipine 5mg OD", "Telmisartan 40mg OD"],
    priorTreatments: [
      { type: "Surgery", name: "Right upper lobectomy", date: "2024-01", hospital: "Tata Memorial Hospital" }
    ],
    labValues: { hemoglobin: 12.5, wbc: 7200, platelets: 245000, creatinine: 0.9, bilirubin: 0.7, alt: 28, ast: 32 },
    ecogStatus: 1,
    smokingStatus: "Former smoker",
    allergies: []
  },
  {
    id: "ANON_MH_002",
    age: 42,
    gender: "Female",
    city: "Pune",
    state: "Maharashtra",
    coordinates: { lat: 18.5204, lng: 73.8567 },
    diagnosis: "Breast Cancer",
    subtype: "Invasive Ductal Carcinoma",
    stage: "Stage IIIA",
    icd10: "C50.911",
    biomarkers: { HER2: "Positive (3+)", ER: "Positive 80%", PR: "Positive 60%", Ki67: "25%" },
    medicalHistory: [],
    medications: ["Tamoxifen 20mg OD"],
    priorTreatments: [
      { type: "Surgery", name: "Modified radical mastectomy", date: "2025-01", hospital: "Deenanath Mangeshkar" }
    ],
    labValues: { hemoglobin: 11.8, wbc: 6800, platelets: 210000, creatinine: 0.8, bilirubin: 0.6, alt: 22, ast: 25 },
    ecogStatus: 0,
    smokingStatus: "Never smoker",
    allergies: ["Penicillin"]
  },
  {
    id: "ANON_DL_003",
    age: 62,
    gender: "Male",
    city: "New Delhi",
    state: "Delhi",
    coordinates: { lat: 28.7041, lng: 77.1025 },
    diagnosis: "Non-Small Cell Lung Cancer",
    subtype: "Squamous Cell Carcinoma",
    stage: "Stage IIIB",
    icd10: "C34.3",
    biomarkers: { EGFR: "L858R", PDL1: "TPS 45%", KRAS: "Negative" },
    medicalHistory: ["COPD", "Hypertension", "former smoker"],
    medications: ["Tiotropium 18mcg OD", "Aspirin 75mg OD", "Amlodipine 10mg OD"],
    priorTreatments: [],
    labValues: { hemoglobin: 13.2, wbc: 8500, platelets: 260000, creatinine: 1.1, bilirubin: 0.8, alt: 35, ast: 38 },
    ecogStatus: 1,
    smokingStatus: "Former smoker",
    allergies: []
  },
  {
    id: "ANON_KA_004",
    age: 58,
    gender: "Male",
    city: "Bangalore",
    state: "Karnataka",
    coordinates: { lat: 12.9716, lng: 77.5946 },
    diagnosis: "Colorectal Cancer",
    subtype: "Adenocarcinoma",
    stage: "Stage IV",
    icd10: "C18.7",
    biomarkers: { KRAS: "Wild Type", NRAS: "Wild Type", BRAF: "V600E" },
    medicalHistory: ["Type 2 Diabetes", "Hyperlipidemia"],
    medications: ["Metformin 1000mg BD", "Atorvastatin 20mg HS"],
    priorTreatments: [
      { type: "Surgery", name: "Right hemicolectomy", date: "2024-08", hospital: "Manipal Hospital" }
    ],
    labValues: { hemoglobin: 10.5, wbc: 6200, platelets: 320000, creatinine: 1.0, bilirubin: 1.2, alt: 45, ast: 52 },
    ecogStatus: 1,
    smokingStatus: "Former smoker",
    allergies: ["Sulfa drugs"]
  },
  {
    id: "ANON_TN_005",
    age: 35,
    gender: "Female",
    city: "Chennai",
    state: "Tamil Nadu",
    coordinates: { lat: 13.0827, lng: 80.2707 },
    diagnosis: "Breast Cancer",
    subtype: "Triple Negative",
    stage: "Stage IIB",
    icd10: "C50.914",
    biomarkers: { HER2: "Negative", ER: "Negative", PR: "Negative", Ki67: "60%" },
    medicalHistory: [],
    medications: [],
    priorTreatments: [
      { type: "Chemotherapy", name: "AC-T neoadjuvant", date: "2024-11", hospital: "Cancer Institute" }
    ],
    labValues: { hemoglobin: 11.2, wbc: 5900, platelets: 195000, creatinine: 0.7, bilirubin: 0.5, alt: 18, ast: 20 },
    ecogStatus: 0,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_GJ_006",
    age: 65,
    gender: "Male",
    city: "Ahmedabad",
    state: "Gujarat",
    coordinates: { lat: 23.0225, lng: 72.5714 },
    diagnosis: "Gastric Cancer",
    subtype: "Intestinal Type",
    stage: "Stage IV",
    icd10: "C16.2",
    biomarkers: { HER2: "Negative", PDL1: "CPS 5" },
    medicalHistory: ["Hypertension", "GERD"],
    medications: ["Omeprazole 20mg BD", "Telmisartan 40mg OD"],
    priorTreatments: [],
    labValues: { hemoglobin: 9.8, wbc: 7100, platelets: 180000, creatinine: 1.2, bilirubin: 1.5, alt: 65, ast: 78 },
    ecogStatus: 1,
    smokingStatus: "Former smoker",
    allergies: []
  },
  {
    id: "ANON_WB_007",
    age: 48,
    gender: "Female",
    city: "Kolkata",
    state: "West Bengal",
    coordinates: { lat: 22.5726, lng: 88.3639 },
    diagnosis: "Ovarian Cancer",
    subtype: "High Grade Serous",
    stage: "Stage IIIC",
    icd10: "C56.9",
    biomarkers: { BRCA1: "Wild Type", BRCA2: "Positive", CA125: "450 U/mL" },
    medicalHistory: ["Hypothyroidism"],
    medications: ["Thyroxine 75mcg OD"],
    priorTreatments: [
      { type: "Surgery", name: "Debulking surgery", date: "2025-01", hospital: "SSKM Hospital" }
    ],
    labValues: { hemoglobin: 10.8, wbc: 6500, platelets: 220000, creatinine: 0.8, bilirubin: 0.6, alt: 24, ast: 28 },
    ecogStatus: 1,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_UP_008",
    age: 38,
    gender: "Male",
    city: "Lucknow",
    state: "Uttar Pradesh",
    coordinates: { lat: 26.8467, lng: 80.9462 },
    diagnosis: "Hepatitis C",
    subtype: "Chronic",
    stage: "F3 Fibrosis",
    icd10: "B18.2",
    biomarkers: { HCV_RNA: "Positive", genotype: "3a" },
    medicalHistory: [],
    medications: [],
    priorTreatments: [],
    labValues: { hemoglobin: 13.5, wbc: 7800, platelets: 250000, creatinine: 0.9, bilirubin: 1.0, alt: 85, ast: 95 },
    ecogStatus: 0,
    smokingStatus: "Former smoker",
    allergies: []
  },
  {
    id: "ANON_PB_009",
    age: 55,
    gender: "Male",
    city: "Chandigarh",
    state: "Punjab",
    coordinates: { lat: 30.7333, lng: 76.7794 },
    diagnosis: "Type 2 Diabetes",
    subtype: "",
    stage: "",
    icd10: "E11.9",
    biomarkers: {},
    medicalHistory: ["Diabetic Nephropathy", "Hypertension", "Dyslipidemia"],
    medications: ["Metformin 1000mg BD", "Glimepiride 2mg OD", "Telmisartan 80mg OD", "Atorvastatin 40mg HS"],
    priorTreatments: [],
    labValues: { hemoglobin: 11.5, wbc: 7000, platelets: 200000, creatinine: 1.8, bilirubin: 0.8, alt: 32, ast: 28 },
    ecogStatus: 2,
    smokingStatus: "Former smoker",
    allergies: ["NSAIDs"]
  },
  {
    id: "ANON_TG_010",
    age: 28,
    gender: "Female",
    city: "Hyderabad",
    state: "Telangana",
    coordinates: { lat: 17.3850, lng: 78.4867 },
    diagnosis: "Lymphoma",
    subtype: "Diffuse Large B-Cell",
    stage: "Stage III",
    icd10: "C83.3",
    biomarkers: { CD20: "Positive", BCL2: "Negative", MYC: "Positive", Ki67: "80%" },
    medicalHistory: [],
    medications: [],
    priorTreatments: [
      { type: "Chemotherapy", name: "R-CHOP x6", date: "2024-06", hospital: "Apollo Cancer Centre" }
    ],
    labValues: { hemoglobin: 10.2, wbc: 5500, platelets: 150000, creatinine: 0.7, bilirubin: 0.5, alt: 15, ast: 18 },
    ecogStatus: 1,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_KL_011",
    age: 72,
    gender: "Male",
    city: "Thiruvananthapuram",
    state: "Kerala",
    coordinates: { lat: 8.5241, lng: 76.9365 },
    diagnosis: "Peripheral Artery Disease",
    subtype: "",
    stage: "",
    icd10: "I73.9",
    biomarkers: {},
    medicalHistory: ["Type 2 Diabetes", "Hypertension", "Hyperlipidemia", "Smoking"],
    medications: ["Clopidogrel 75mg OD", "Atorvastatin 40mg HS", "Metformin 500mg BD"],
    priorTreatments: [],
    labValues: { hemoglobin: 12.0, wbc: 8000, platelets: 240000, creatinine: 1.3, bilirubin: 0.7, alt: 28, ast: 25 },
    ecogStatus: 2,
    smokingStatus: "Current smoker",
    allergies: ["Aspirin"]
  },
  {
    id: "ANON_MP_012",
    age: 45,
    gender: "Female",
    city: "Bhopal",
    state: "Madhya Pradesh",
    coordinates: { lat: 23.2599, lng: 77.4126 },
    diagnosis: "Non-Small Cell Lung Cancer",
    subtype: "Adenocarcinoma",
    stage: "Stage II",
    icd10: "C34.9",
    biomarkers: { EGFR: "Exon 20 Insertion", ALK: "Negative", ROS1: "Negative" },
    medicalHistory: [],
    medications: [],
    priorTreatments: [
      { type: "Surgery", name: "Lobectomy", date: "2024-11", hospital: "Bhopal Memorial Hospital" }
    ],
    labValues: { hemoglobin: 12.8, wbc: 6900, platelets: 230000, creatinine: 0.8, bilirubin: 0.6, alt: 20, ast: 22 },
    ecogStatus: 0,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_AS_013",
    age: 32,
    gender: "Male",
    city: "Guwahati",
    state: "Assam",
    coordinates: { lat: 26.1445, lng: 91.7362 },
    diagnosis: "Tuberculosis",
    subtype: "MDR-TB",
    stage: "",
    icd10: "A15.9",
    biomarkers: { sputum_smear: "Positive", CBNAAT: "Rifampicin Resistant" },
    medicalHistory: ["HIV Positive", "on ART"],
    medications: ["Rifampicin", "Isoniazid", "Pyrazinamide", "Ethambutol", "Levofloxacin"],
    priorTreatments: [],
    labValues: { hemoglobin: 10.0, wbc: 9200, platelets: 280000, creatinine: 0.7, bilirubin: 0.8, alt: 30, ast: 35 },
    ecogStatus: 1,
    smokingStatus: "Former smoker",
    allergies: []
  },
  {
    id: "ANON_RJ_014",
    age: 68,
    gender: "Male",
    city: "Jaipur",
    state: "Rajasthan",
    coordinates: { lat: 26.9124, lng: 75.7873 },
    diagnosis: "Coronary Artery Disease",
    subtype: "Triple Vessel Disease",
    stage: "",
    icd10: "I25.10",
    biomarkers: { LDL: "145 mg/dL", HDL: "35 mg/dL", TG: "180 mg/dL" },
    medicalHistory: ["Type 2 Diabetes", "Hypertension", "Former smoker"],
    medications: ["Aspirin 75mg OD", "Clopidogrel 75mg OD", "Atorvastatin 40mg HS", "Metoprolol 25mg BD", "Ramipril 5mg OD"],
    priorTreatments: [
      { type: "Intervention", name: "Diagnostic Angiography", date: "2025-02", hospital: "Fortis Escorts" }
    ],
    labValues: { hemoglobin: 13.0, wbc: 7500, platelets: 210000, creatinine: 1.2, bilirubin: 0.9, alt: 38, ast: 42 },
    ecogStatus: 2,
    smokingStatus: "Former smoker",
    allergies: []
  },
  {
    id: "ANON_MH_015",
    age: 52,
    gender: "Female",
    city: "Mumbai",
    state: "Maharashtra",
    coordinates: { lat: 19.0760, lng: 72.8777 },
    diagnosis: "Breast Cancer",
    subtype: "HR+/HER2-",
    stage: "Stage IV",
    icd10: "C50.919",
    biomarkers: { HER2: "Negative (0)", ER: "Positive 90%", PR: "Positive 85%", Ki67: "15%" },
    medicalHistory: ["Hypothyroidism"],
    medications: ["Letrozole 2.5mg OD", "Thyroxine 50mcg OD"],
    priorTreatments: [
      { type: "Surgery", name: "Lumpectomy + SLNB", date: "2023-08", hospital: "Kokilaben Hospital" },
      { type: "Chemotherapy", name: "TC x4", date: "2023-10", hospital: "Kokilaben Hospital" }
    ],
    labValues: { hemoglobin: 11.5, wbc: 6200, platelets: 205000, creatinine: 0.7, bilirubin: 0.5, alt: 18, ast: 20 },
    ecogStatus: 0,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_MH_016",
    age: 67,
    gender: "Male",
    city: "Nagpur",
    state: "Maharashtra",
    coordinates: { lat: 21.1458, lng: 79.0882 },
    diagnosis: "Small Cell Lung Cancer",
    subtype: "Small Cell Carcinoma",
    stage: "Extensive Stage",
    icd10: "C34.9",
    biomarkers: { PDL1: "TPS 30%", MYC: "Amplified" },
    medicalHistory: ["COPD", "Smoking history"],
    medications: ["Tiotropium", "Theophylline"],
    priorTreatments: [],
    labValues: { hemoglobin: 11.2, wbc: 11200, platelets: 180000, creatinine: 1.0, bilirubin: 0.8, alt: 32, ast: 35 },
    ecogStatus: 1,
    smokingStatus: "Current smoker",
    allergies: []
  },
  {
    id: "ANON_UP_017",
    age: 58,
    gender: "Male",
    city: "Lucknow",
    state: "Uttar Pradesh",
    coordinates: { lat: 26.8467, lng: 80.9462 },
    diagnosis: "Hepatocellular Carcinoma",
    subtype: "HCC",
    stage: "BCLC Stage C",
    icd10: "C22.0",
    biomarkers: { AFP: "520 ng/mL", HBV: "Positive", HCV: "Negative" },
    medicalHistory: ["Cirrhosis", "Type 2 Diabetes", "Hypertension"],
    medications: ["Metformin", "Telmisartan", "Lactulose"],
    priorTreatments: [
      { type: "TACE", name: "TACE x2", date: "2024-06", hospital: "SGPGIMS" }
    ],
    labValues: { hemoglobin: 10.8, wbc: 5400, platelets: 95000, creatinine: 1.2, bilirubin: 2.1, alt: 45, ast: 62 },
    ecogStatus: 1,
    smokingStatus: "Former smoker",
    allergies: ["Sulfa"]
  },
  {
    id: "ANON_DL_018",
    age: 72,
    gender: "Male",
    city: "New Delhi",
    state: "Delhi",
    coordinates: { lat: 28.7041, lng: 77.1025 },
    diagnosis: "Atrial Fibrillation",
    subtype: "Non-valvular AF",
    stage: "Persistent",
    icd10: "I48.91",
    biomarkers: {},
    medicalHistory: ["Hypertension", "Diabetes", "CHF", "Prior TIA"],
    medications: ["Amlodipine", "Metformin", "Furosemide", "Aspirin"],
    priorTreatments: [],
    labValues: { hemoglobin: 13.5, wbc: 7800, platelets: 220000, creatinine: 1.3, bilirubin: 0.9, alt: 25, ast: 28 },
    ecogStatus: 1,
    smokingStatus: "Former smoker",
    allergies: ["Warfarin"]
  },
  {
    id: "ANON_TN_019",
    age: 52,
    gender: "Female",
    city: "Chennai",
    state: "Tamil Nadu",
    coordinates: { lat: 13.0827, lng: 80.2707 },
    diagnosis: "Type 2 Diabetes",
    subtype: "T2DM with CKD",
    stage: "CKD Stage 3",
    icd10: "E11.22",
    biomarkers: { eGFR: "45 ml/min", UACR: "450 mg/g" },
    medicalHistory: ["Hypertension", "Hyperlipidemia", "Obesity"],
    medications: ["Metformin 1000mg BD", "Glimepiride 2mg OD", "Telmisartan 80mg OD", "Atorvastatin 20mg HS"],
    priorTreatments: [],
    labValues: { hemoglobin: 11.5, wbc: 6800, platelets: 210000, creatinine: 1.8, bilirubin: 0.6, alt: 22, ast: 18 },
    ecogStatus: 1,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_KA_020",
    age: 35,
    gender: "Male",
    city: "Bangalore",
    state: "Karnataka",
    coordinates: { lat: 12.9716, lng: 77.5946 },
    diagnosis: "MDR-TB",
    subtype: "Rifampicin Resistant",
    stage: "Pulmonary",
    icd10: "A15.0",
    biomarkers: { Xpert: "MTB Detected, RIF Resistant", LPA: "RR" },
    medicalHistory: ["HIV negative"],
    medications: ["HRZE", "Kanamycin", "Levofloxacin"],
    priorTreatments: [
      { type: "ATT", name: "First line x6 months", date: "2024-01", hospital: "NTI Bangalore" }
    ],
    labValues: { hemoglobin: 10.2, wbc: 9200, platelets: 280000, creatinine: 0.7, bilirubin: 0.5, alt: 28, ast: 25 },
    ecogStatus: 1,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_WB_021",
    age: 45,
    gender: "Female",
    city: "Kolkata",
    state: "West Bengal",
    coordinates: { lat: 22.5726, lng: 88.3639 },
    diagnosis: "Diffuse Large B-Cell Lymphoma",
    subtype: "DLBCL GCB Type",
    stage: "Stage IIIA",
    icd10: "C83.3",
    biomarkers: { CD20: "Positive", BCL2: "60%", BCL6: "70%", MYC: "40%" },
    medicalHistory: [],
    medications: [],
    priorTreatments: [],
    labValues: { hemoglobin: 10.5, wbc: 8200, platelets: 175000, creatinine: 0.8, bilirubin: 0.6, alt: 18, ast: 22 },
    ecogStatus: 0,
    smokingStatus: "Never smoker",
    allergies: ["Penicillin"]
  },
  {
    id: "ANON_MH_022",
    age: 42,
    gender: "Female",
    city: "Pune",
    state: "Maharashtra",
    coordinates: { lat: 18.5204, lng: 73.8567 },
    diagnosis: "Subclinical Hypothyroidism",
    subtype: "Hashimoto's",
    stage: "Primary",
    icd10: "E03.9",
    biomarkers: { TSH: "12.5 mIU/L", T4: "0.9 ng/dL", TPOAb: "Positive" },
    medicalHistory: ["Iron deficiency anemia"],
    medications: ["Ferrous sulfate"],
    priorTreatments: [],
    labValues: { hemoglobin: 11.2, wbc: 6200, platelets: 230000, creatinine: 0.7, bilirubin: 0.5, alt: 15, ast: 18 },
    ecogStatus: 0,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_KA_023",
    age: 32,
    gender: "Male",
    city: "Bangalore",
    state: "Karnataka",
    coordinates: { lat: 12.9716, lng: 77.5946 },
    diagnosis: "Polycystic Kidney Disease",
    subtype: "ADPKD",
    stage: "CKD Stage 2",
    icd10: "Q61.2",
    biomarkers: { eGFR: "78 ml/min", TKV: "980 mL" },
    medicalHistory: ["Hypertension"],
    medications: ["Tolvaptan 30mg BD", "Amlodipine 5mg OD"],
    priorTreatments: [],
    labValues: { hemoglobin: 14.2, wbc: 7200, platelets: 260000, creatinine: 1.1, bilirubin: 0.8, alt: 20, ast: 22 },
    ecogStatus: 0,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_MH_024",
    age: 61,
    gender: "Male",
    city: "Mumbai",
    state: "Maharashtra",
    coordinates: { lat: 19.0760, lng: 72.8777 },
    diagnosis: "Non-Small Cell Lung Cancer",
    subtype: "Adenocarcinoma",
    stage: "Stage IV",
    icd10: "C34.1",
    biomarkers: { KRAS: "G12C", PDL1: "TPS 15%", TP53: "Mutation" },
    medicalHistory: ["Hypertension", "Hyperlipidemia"],
    medications: ["Amlodipine", "Atorvastatin"],
    priorTreatments: [
      { type: "Chemotherapy", name: "Pemetrexed + Carboplatin x4", date: "2024-08", hospital: "Tata Memorial" }
    ],
    labValues: { hemoglobin: 11.8, wbc: 6800, platelets: 195000, creatinine: 0.9, bilirubin: 0.7, alt: 28, ast: 32 },
    ecogStatus: 1,
    smokingStatus: "Former smoker",
    allergies: []
  },
  {
    id: "ANON_UP_025",
    age: 38,
    gender: "Female",
    city: "Lucknow",
    state: "Uttar Pradesh",
    coordinates: { lat: 26.8467, lng: 80.9462 },
    diagnosis: "Ulcerative Colitis",
    subtype: "Extensive",
    stage: "Moderate-Severe",
    icd10: "K51.0",
    biomarkers: { CRP: "25 mg/L", Calprotectin: "380 mcg/g" },
    medicalHistory: [],
    medications: ["Mesalamine 2g BD", "Prednisolone 20mg OD"],
    priorTreatments: [],
    labValues: { hemoglobin: 10.5, wbc: 8200, platelets: 320000, creatinine: 0.6, bilirubin: 0.4, alt: 18, ast: 15 },
    ecogStatus: 1,
    smokingStatus: "Never smoker",
    allergies: ["Sulfasalazine"]
  },
  {
    id: "ANON_TN_026",
    age: 68,
    gender: "Male",
    city: "Chennai",
    state: "Tamil Nadu",
    coordinates: { lat: 13.0827, lng: 80.2707 },
    diagnosis: "Multiple Myeloma",
    subtype: "IgG Kappa",
    stage: "Stage III",
    icd10: "C90.00",
    biomarkers: { "M-Spike": "3.2 g/dL", Beta2M: "4.5 mg/L", LDH: "280 U/L" },
    medicalHistory: ["Renal impairment"],
    medications: ["Bortezomib", "Dexamethasone"],
    priorTreatments: [
      { type: "Chemotherapy", name: "VRd x4", date: "2024-05", hospital: "Cancer Institute" }
    ],
    labValues: { hemoglobin: 9.2, wbc: 4200, platelets: 95000, creatinine: 2.1, bilirubin: 0.9, alt: 28, ast: 32 },
    ecogStatus: 2,
    smokingStatus: "Former smoker",
    allergies: []
  },
  {
    id: "ANON_PB_027",
    age: 48,
    gender: "Male",
    city: "Chandigarh",
    state: "Punjab",
    coordinates: { lat: 30.7333, lng: 76.7794 },
    diagnosis: "Alcoholic Hepatitis",
    subtype: "Severe",
    stage: "Maddrey 42",
    icd10: "K70.1",
    biomarkers: { Maddrey: "42", AST: "280 U/L", ALT: "120 U/L" },
    medicalHistory: ["Alcohol use disorder", "Cirrhosis"],
    medications: ["Prednisolone 40mg OD", "NAC"],
    priorTreatments: [],
    labValues: { hemoglobin: 9.5, wbc: 11200, platelets: 68000, creatinine: 1.4, bilirubin: 8.2, alt: 120, ast: 280 },
    ecogStatus: 2,
    smokingStatus: "Current smoker",
    allergies: []
  },
  {
    id: "ANON_KA_028",
    age: 42,
    gender: "Female",
    city: "Bangalore",
    state: "Karnataka",
    coordinates: { lat: 12.9716, lng: 77.5946 },
    diagnosis: "Multiple Sclerosis",
    subtype: "Primary Progressive",
    stage: "EDSS 4.5",
    icd10: "G35",
    biomarkers: { OCB: "Positive", MRI: "Multiple lesions" },
    medicalHistory: [],
    medications: ["Ocrelizumab 600mg"],
    priorTreatments: [],
    labValues: { hemoglobin: 12.5, wbc: 6800, platelets: 240000, creatinine: 0.7, bilirubin: 0.5, alt: 18, ast: 20 },
    ecogStatus: 1,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_DL_029",
    age: 55,
    gender: "Male",
    city: "New Delhi",
    state: "Delhi",
    coordinates: { lat: 28.7041, lng: 77.1025 },
    diagnosis: "Acute Coronary Syndrome",
    subtype: "NSTEMI",
    stage: "Killip II",
    icd10: "I21.4",
    biomarkers: { Troponin: "2.5 ng/mL", BNP: "680 pg/mL" },
    medicalHistory: ["Diabetes", "Hypertension", "Smoking"],
    medications: ["Aspirin", "Clopidogrel", "Atorvastatin", "Metoprolol"],
    priorTreatments: [],
    labValues: { hemoglobin: 12.8, wbc: 9800, platelets: 210000, creatinine: 1.2, bilirubin: 0.8, alt: 32, ast: 38 },
    ecogStatus: 1,
    smokingStatus: "Current smoker",
    allergies: []
  },
  {
    id: "ANON_WB_030",
    age: 70,
    gender: "Female",
    city: "Kolkata",
    state: "West Bengal",
    coordinates: { lat: 22.5726, lng: 88.3639 },
    diagnosis: "Myelodysplastic Syndrome",
    subtype: "RARS",
    stage: "IPSS Intermediate-1",
    icd10: "D46.1",
    biomarkers: { BoneMarrow: "15% blasts", Cytogenetics: "5q-", Ferritin: "850 ng/mL" },
    medicalHistory: ["Iron overload"],
    medications: ["Luspatercept", "Deferasirox"],
    priorTreatments: [
      { type: "Transfusion", name: "PRBC x4/month", date: "2024-01", hospital: "Tata Medical Center" }
    ],
    labValues: { hemoglobin: 7.8, wbc: 3200, platelets: 45000, creatinine: 0.9, bilirubin: 1.2, alt: 22, ast: 25 },
    ecogStatus: 2,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_GJ_031",
    age: 45,
    gender: "Male",
    city: "Ahmedabad",
    state: "Gujarat",
    coordinates: { lat: 23.0225, lng: 72.5714 },
    diagnosis: "Chronic Myeloid Leukemia",
    subtype: "CML-CP",
    stage: "Chronic Phase",
    icd10: "C92.1",
    biomarkers: { BCRABL: "IS 25%", Philadelphia: "Positive" },
    medicalHistory: [],
    medications: ["Imatinib 400mg OD"],
    priorTreatments: [],
    labValues: { hemoglobin: 10.2, wbc: 45000, platelets: 380000, creatinine: 0.8, bilirubin: 0.6, alt: 20, ast: 18 },
    ecogStatus: 0,
    smokingStatus: "Former smoker",
    allergies: []
  },
  {
    id: "ANON_TN_032",
    age: 58,
    gender: "Female",
    city: "Coimbatore",
    state: "Tamil Nadu",
    coordinates: { lat: 11.0168, lng: 76.9558 },
    diagnosis: "Ovarian Cancer",
    subtype: "High Grade Serous",
    stage: "Stage IIIC",
    icd10: "C56.9",
    biomarkers: { BRCA1: "Wild Type", BRCA2: "Positive", CA125: "485 U/mL" },
    medicalHistory: ["Hypertension"],
    medications: ["Carboplatin", "Paclitaxel"],
    priorTreatments: [
      { type: "Surgery", name: "Optimal debulking", date: "2024-03", hospital: "CMC Vellore" }
    ],
    labValues: { hemoglobin: 10.8, wbc: 5800, platelets: 175000, creatinine: 0.7, bilirubin: 0.5, alt: 22, ast: 25 },
    ecogStatus: 1,
    smokingStatus: "Never smoker",
    allergies: []
  },
  {
    id: "ANON_RJ_033",
    age: 28,
    gender: "Female",
    city: "Jaipur",
    state: "Rajasthan",
    coordinates: { lat: 26.9124, lng: 75.7873 },
    diagnosis: "Systemic Lupus Erythematosus",
    subtype: "SLE",
    stage: "Active",
    icd10: "M32.9",
    biomarkers: { ANA: "Positive 1:320", dsDNA: "Positive", Complement: "Low C3" },
    medicalHistory: [],
    medications: ["Hydroxychloroquine 200mg BD", "Prednisolone 15mg OD", "Azathioprine 50mg OD"],
    priorTreatments: [],
    labValues: { hemoglobin: 10.5, wbc: 4200, platelets: 120000, creatinine: 0.8, bilirubin: 0.4, alt: 28, ast: 22 },
    ecogStatus: 1,
    smokingStatus: "Never smoker",
    allergies: ["Sulfa"]
  },
  {
    id: "ANON_AS_034",
    age: 52,
    gender: "Male",
    city: "Guwahati",
    state: "Assam",
    coordinates: { lat: 26.1445, lng: 91.7362 },
    diagnosis: "Gastric Cancer",
    subtype: "Intestinal Type",
    stage: "Stage III",
    icd10: "C16.9",
    biomarkers: { HER2: "Negative", EBV: "Negative", MSI: "Stable" },
    medicalHistory: [],
    medications: ["SOX regimen"],
    priorTreatments: [],
    labValues: { hemoglobin: 10.2, wbc: 6800, platelets: 195000, creatinine: 0.9, bilirubin: 0.7, alt: 25, ast: 28 },
    ecogStatus: 1,
    smokingStatus: "Current smoker",
    allergies: []
  },
  {
    id: "ANON_KL_035",
    age: 65,
    gender: "Male",
    city: "Kochi",
    state: "Kerala",
    coordinates: { lat: 9.9312, lng: 76.2673 },
    diagnosis: "Pancreatic Cancer",
    subtype: "Adenocarcinoma",
    stage: "Stage IV",
    icd10: "C25.0",
    biomarkers: { CA199: "680 U/mL", KRAS: "G12D", SMAD4: "Loss" },
    medicalHistory: ["Diabetes", "Smoking"],
    medications: ["Gemcitabine + Nab-Paclitaxel"],
    priorTreatments: [],
    labValues: { hemoglobin: 10.8, wbc: 7200, platelets: 185000, creatinine: 1.0, bilirubin: 1.8, alt: 45, ast: 52 },
    ecogStatus: 1,
    smokingStatus: "Former smoker",
    allergies: []
  }
];

export function findMatchingTrials(patient: Patient, trials: ClinicalTrial[]): ClinicalTrial[] {
  return trials.filter(trial => {
    if (patient.age < trial.minAge || patient.age > trial.maxAge) return false;
    if (trial.gender !== "All" && patient.gender !== trial.gender) return false;
    if (patient.ecogStatus > trial.ecogMax) return false;
    
    const diagnosisMatch = trial.requiredDiagnoses.some(d => 
      patient.diagnosis.toLowerCase().includes(d.toLowerCase())
    );
    if (!diagnosisMatch) return false;
    
    if (trial.requiredStages && trial.requiredStages.length > 0) {
      const stageMatch = trial.requiredStages.some(s => patient.stage.includes(s));
      if (!stageMatch) return false;
    }
    
    if (trial.requiredBiomarkers && trial.requiredBiomarkers.length > 0) {
      const biomarkerMatch = trial.requiredBiomarkers.some(b => 
        Object.values(patient.biomarkers).some(pb => pb.toLowerCase().includes(b.toLowerCase()))
      );
      if (!biomarkerMatch) return false;
    }
    
    return true;
  });
}

export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371;
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function getTrialById(trials: ClinicalTrial[], trialId: string): ClinicalTrial | undefined {
  return trials.find(t => t.trialId === trialId || t.id === trialId);
}

export function getPatientById(patients: Patient[], patientId: string): Patient | undefined {
  return patients.find(p => p.id === patientId);
}

export function getTrialsByCondition(trials: ClinicalTrial[], condition: string): ClinicalTrial[] {
  return trials.filter(t => 
    t.conditions.some(c => c.toLowerCase().includes(condition.toLowerCase()))
  );
}

export function getTrialsByLocation(trials: ClinicalTrial[], city: string, state?: string): ClinicalTrial[] {
  return trials.filter(t => 
    t.locations.some(l => 
      l.city.toLowerCase().includes(city.toLowerCase()) &&
      (!state || l.state.toLowerCase() === state.toLowerCase())
    )
  );
}

export interface EligibilityResult {
  trial: ClinicalTrial;
  eligible: boolean;
  reasons: string[];
  criteriaResults: {
    category: string;
    passed: boolean;
    detail: string;
  }[];
}

export function checkEligibility(patient: Patient, trial: ClinicalTrial): EligibilityResult {
  const results: EligibilityResult = {
    trial,
    eligible: true,
    reasons: [],
    criteriaResults: []
  };

  if (patient.age < trial.minAge) {
    results.eligible = false;
    results.criteriaResults.push({
      category: "Age",
      passed: false,
      detail: `Patient age ${patient.age} is below minimum ${trial.minAge}`
    });
  } else if (patient.age > trial.maxAge) {
    results.eligible = false;
    results.criteriaResults.push({
      category: "Age",
      passed: false,
      detail: `Patient age ${patient.age} exceeds maximum ${trial.maxAge}`
    });
  } else {
    results.criteriaResults.push({
      category: "Age",
      passed: true,
      detail: `Age ${patient.age} within range ${trial.minAge}-${trial.maxAge}`
    });
  }

  if (trial.gender !== "All" && patient.gender !== trial.gender) {
    results.eligible = false;
    results.criteriaResults.push({
      category: "Gender",
      passed: false,
      detail: `Required ${trial.gender}, patient is ${patient.gender}`
    });
  } else {
    results.criteriaResults.push({
      category: "Gender",
      passed: true,
      detail: trial.gender === "All" ? "Any gender accepted" : `Matches ${patient.gender}`
    });
  }

  if (patient.ecogStatus > trial.ecogMax) {
    results.eligible = false;
    results.criteriaResults.push({
      category: "ECOG",
      passed: false,
      detail: `ECOG ${patient.ecogStatus} exceeds maximum ${trial.ecogMax}`
    });
  } else {
    results.criteriaResults.push({
      category: "ECOG",
      passed: true,
      detail: `ECOG ${patient.ecogStatus} within limit ${trial.ecogMax}`
    });
  }

  const diagnosisMatch = trial.requiredDiagnoses.some(d => 
    patient.diagnosis.toLowerCase().includes(d.toLowerCase())
  );
  if (!diagnosisMatch) {
    results.eligible = false;
    results.criteriaResults.push({
      category: "Diagnosis",
      passed: false,
      detail: `Diagnosis "${patient.diagnosis}" does not match required: ${trial.requiredDiagnoses.join(", ")}`
    });
  } else {
    results.criteriaResults.push({
      category: "Diagnosis",
      passed: true,
      detail: `Diagnosis matches: ${patient.diagnosis}`
    });
  }

  if (trial.requiredStages && trial.requiredStages.length > 0) {
    const stageMatch = trial.requiredStages.some(s => patient.stage.includes(s));
    if (!stageMatch) {
      results.eligible = false;
      results.criteriaResults.push({
        category: "Stage",
        passed: false,
        detail: `Stage "${patient.stage}" not in required: ${trial.requiredStages.join(", ")}`
      });
    } else {
      results.criteriaResults.push({
        category: "Stage",
        passed: true,
        detail: `Stage ${patient.stage} is acceptable`
      });
    }
  }

  if (trial.requiredBiomarkers && trial.requiredBiomarkers.length > 0) {
    const biomarkerMatch = trial.requiredBiomarkers.some(b => 
      Object.values(patient.biomarkers).some(pb => pb.toLowerCase().includes(b.toLowerCase()))
    );
    if (!biomarkerMatch) {
      results.criteriaResults.push({
        category: "Biomarkers",
        passed: false,
        detail: `Required biomarkers not found: ${trial.requiredBiomarkers.join(", ")}`
      });
    } else {
      results.criteriaResults.push({
        category: "Biomarkers",
        passed: true,
        detail: `Required biomarkers present`
      });
    }
  }

  return results;
}

export function getAllConditions(trials: ClinicalTrial[]): string[] {
  const conditions = new Set<string>();
  trials.forEach(t => t.conditions.forEach(c => conditions.add(c)));
  return Array.from(conditions).sort();
}

export function getAllStates(trials: ClinicalTrial[]): string[] {
  const states = new Set<string>();
  trials.forEach(t => t.locations.forEach(l => states.add(l.state)));
  return Array.from(states).sort();
}

export function getPatientSummary(patient: Patient): string {
  return `${patient.age}${patient.gender.charAt(0)}, ${patient.city}, ${patient.diagnosis}, ${patient.stage}, ECOG ${patient.ecogStatus}`;
}
