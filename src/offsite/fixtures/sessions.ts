/**
 * Session catalogue. Exists so the attending list can name the specific thing
 * two people share — "Both in Scaling Inference on a Budget" is a conversation
 * opener; "In one of your sessions" is a field match (DESIGN.md #17).
 *
 * Keep this wide. A narrow catalogue makes almost everyone a session-match,
 * which collapses the grouped list into one giant section and defeats the
 * point of grouping at all (DESIGN.md #16).
 */
export const sessionTitles: Record<string, string> = {
  s1: 'Scaling Inference on a Budget',
  s2: 'Design Systems at Series B',
  s3: 'The Developer Experience Gap',
  s4: 'Payments Infrastructure in 2026',
  s5: 'Platform Engineering Without a Platform Team',
  s6: 'Climate Data You Can Actually Use',
  s7: 'Research Ops for Small Teams',
  s8: 'Accessibility as a Default',
  s9: 'Evaluating Model Quality in Production',
  s10: 'Incident Response for Humans',
}
