
export interface ComparisonResult {
  summary: string;
  risks: LegalRisk[];
  clauseAnalysis: ClauseComparison[];
  criticalChanges: string[];
  recommendation: string;
}

export interface LegalRisk {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  impact: string;
}

export interface ClauseComparison {
  clauseTitle: string;
  category: 'Liability' | 'Intellectual Property' | 'Termination' | 'Payment' | 'General' | 'Confidentiality';
  doc1Text: string;
  doc2Text: string;
  significance: string;
}

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export enum ComparisonStep {
  UPLOAD = 'UPLOAD',
  COMPARING = 'COMPARING',
  RESULTS = 'RESULTS'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
