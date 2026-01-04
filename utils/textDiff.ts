
import { DiffPart } from "../types";

/**
 * A simple word-level diffing implementation.
 * In a real-world app, one would use a library like 'diff', 
 * but for this standalone React implementation, we provide a basic version.
 */
export function getDiff(str1: string, str2: string): DiffPart[] {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  
  // Basic implementation showing removals from doc1 and additions in doc2
  // For a production app, use the Myers diff algorithm
  const diff: DiffPart[] = [];
  
  // This is a naive visualization: 
  // We'll just show the second document with highlights of what's new compared to doc 1 words
  const words1Set = new Set(words1);
  
  words2.forEach(word => {
    if (words1Set.has(word)) {
      diff.push({ value: word + " " });
    } else {
      diff.push({ value: word + " ", added: true });
    }
  });
  
  return diff;
}
