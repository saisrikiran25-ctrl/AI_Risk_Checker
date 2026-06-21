/* ============================================================
   AI CONTENT RISK CHECKER — APPLICATION LOGIC
   Full governance scan engine, state management, UI rendering
   ============================================================ */

'use strict';

// ============================================================
// DATA MODEL & STATE
// ============================================================

const AppState = {
  currentView: 'dashboard',
  currentReview: null,       // active scan result
  reviews: [],               // audit log
  governanceConfig: null,    // settings
};

// ============================================================
// GOVERNANCE CONFIGURATION (defaults)
// ============================================================

const DEFAULT_CONFIG = {
  thresholds: { medium: 30, high: 60, critical: 80, stopPublish: 75 },
  watchTerms: [
    'guaranteed results', 'proven to eliminate', 'clinically proven',
    'we guarantee', '100% success', 'zero risk', 'industry-leading',
    'most innovative', '#1 platform', 'disrupting the industry'
  ],
  reviewerMappings: {
    blog:        ['Editor', 'Content Lead'],
    landing:     ['PMM', 'Legal/Compliance'],
    product:     ['PMM', 'Legal/Compliance'],
    email:       ['Editor', 'Content Ops'],
    'paid-ad':   ['PMM', 'Legal/Compliance'],
    social:      ['Editor', 'Brand Reviewer'],
    'case-study':['Editor', 'Customer Marketing'],
    'help-doc':  ['Editor', 'Content Ops'],
    sales:       ['PMM', 'Brand Reviewer'],
    founder:     ['Editorial Lead', 'Founder/Exec Reviewer'],
  },
  policies: {
    noAiTestimonials: true,
    noUnsourcedStats: true,
    noCustomerNames: true,
    noRegulatedClaims: true,
    founderApproval: true,
    aiDisclosure: false,
  }
};

// ============================================================
// SAMPLE CONTENT DATASET (10 realistic demos)
// ============================================================

const SAMPLE_REVIEWS = [
  {
    id: 'RVW-2024-001',
    title: 'SaaS Platform Launch Blog Post',
    contentType: 'blog',
    channel: 'website',
    workflowStage: 'pre-publish',
    date: '2024-01-18T09:23:00Z',
    status: 'needs-human',
    content: `Our platform has helped over 10,000 teams boost productivity by 47% on average, with some customers reporting up to 80% reduction in manual work. Unlike legacy solutions, our AI-powered automation is proven to eliminate bottlenecks entirely. Sarah from Acme Corp said "This completely changed how our team operates — I can't imagine going back." Studies show that companies using automation tools see 3x higher revenue growth. The future of work is here, and our platform is leading the charge as the most innovative solution on the market today.`,
    contextTags: ['ai-assisted', 'customer-facing', 'includes-stats', 'customer-quote'],
    overallScore: 74,
    riskLabel: 'high',
    categoryScores: { claims: 82, privacy: 15, bias: 20, testimonial: 78, citation: 88 },
    flags: [
      { type: 'claims', severity: 'high', snippet: 'boost productivity by 47% on average, with some customers reporting up to 80% reduction in manual work', why: 'Specific quantitative performance claims without a cited source or methodology. Readers may interpret these as verified benchmarks.', action: 'Add source citation or change to approximate language. Route to PMM + Legal before publish.' },
      { type: 'citation', severity: 'high', snippet: 'Studies show that companies using automation tools see 3x higher revenue growth', why: 'Vague authority claim ("Studies show") without naming the study, year, methodology, or sample size.', action: 'Link to the specific research or remove the statistic.' },
      { type: 'testimonial', severity: 'high', snippet: 'Sarah from Acme Corp said "This completely changed how our team operates"', why: 'Named customer testimonial. Requires verifying this person consented to be quoted and that "Acme Corp" approves the association.', action: 'Confirm written customer approval via Customer Marketing before publishing.' },
      { type: 'claims', severity: 'medium', snippet: 'proven to eliminate bottlenecks entirely', why: 'Absolute certainty claim ("proven to eliminate entirely") is difficult to substantiate and may be considered misleading.', action: 'Soften to "helps reduce" or add qualification.' },
      { type: 'claims', severity: 'medium', snippet: 'most innovative solution on the market today', why: 'Unverifiable superlative. Comparative superiority claims require evidence.', action: 'Either substantiate or remove the superlative framing.' },
    ],
    reviewers: { required: ['Editor', 'PMM', 'Customer Marketing'], escalation: ['Legal/Compliance'] },
    actions: [
      'Verify and cite the 47% productivity and 80% reduction statistics before approval.',
      'Confirm written consent from "Sarah at Acme Corp" via Customer Marketing.',
      'Replace "proven to eliminate" with qualified language and link to evidence.',
      'Remove "most innovative" superlative or provide a verifiable comparator source.',
      'Replace "Studies show" with the actual research citation.'
    ],
    user: 'Maya Chen',
    notes: '',
  },
  {
    id: 'RVW-2024-002',
    title: 'Performance Marketing Landing Page',
    contentType: 'landing',
    channel: 'paid-social',
    workflowStage: 'final-approval',
    date: '2024-01-16T14:05:00Z',
    status: 'escalated',
    content: `Guaranteed results in 30 days or your money back. Our clinically validated approach to B2B sales acceleration has been adopted by Fortune 500 leaders who see measurable ROI within the first week. We guarantee you'll close 2x more deals using our method. Join 50,000+ companies that have already transformed their revenue operations. As seen in Forbes, Harvard Business Review, and TechCrunch. Zero risk, total reward.`,
    contextTags: ['customer-facing', 'includes-stats', 'comparative'],
    overallScore: 91,
    riskLabel: 'critical',
    categoryScores: { claims: 95, privacy: 5, bias: 10, testimonial: 40, citation: 85 },
    flags: [
      { type: 'claims', severity: 'critical', snippet: 'Guaranteed results in 30 days or your money back', why: 'Guarantee-of-outcome language on a paid ad landing page is high legal exposure. FTC guidelines require substantiation for performance guarantees.', action: 'Route to Legal/Compliance immediately. Do not publish without sign-off.' },
      { type: 'claims', severity: 'critical', snippet: 'We guarantee you\'ll close 2x more deals', why: 'Specific performance guarantee ("2x more deals") without documented methodology or disclosed sample represents potential consumer protection risk.', action: 'Remove guarantee language or provide FTC-compliant substantiation.' },
      { type: 'claims', severity: 'high', snippet: 'clinically validated approach to B2B sales acceleration', why: '"Clinically validated" implies medical or scientific verification. Applying it to sales methodology is misleading and potentially deceptive.', action: 'Remove "clinically validated" unless a peer-reviewed clinical study exists.' },
      { type: 'citation', severity: 'high', snippet: 'As seen in Forbes, Harvard Business Review, and TechCrunch', why: 'Media placement claims require the content to have actually been featured. "As seen in" implies editorial coverage, not ads.', action: 'Verify each outlet is editorial coverage, not paid placement. Link to articles.' },
      { type: 'claims', severity: 'medium', snippet: 'Zero risk, total reward', why: 'Risk-removal language on a financial/commercial product without disclosure.', action: 'Review with Legal for accuracy; add appropriate disclaimers.' },
    ],
    reviewers: { required: ['PMM', 'Legal/Compliance'], escalation: ['Legal/Compliance'] },
    actions: [
      'STOP PUBLISH: Escalate to Legal/Compliance immediately — guarantee language detected.',
      'Remove "clinically validated" or provide a peer-reviewed citation.',
      'Verify all media placements are editorial, not paid — link to source URLs.',
      'Remove or qualify all absolute guarantee language per FTC guidelines.',
      'Add appropriate disclaimers and remove "Zero risk" framing.'
    ],
    user: 'James Okafor',
    notes: 'Escalated to legal on Jan 17. Awaiting review. Do not publish.',
  },
  {
    id: 'RVW-2024-003',
    title: 'Diversity & Inclusion Email Newsletter',
    contentType: 'email',
    channel: 'email',
    workflowStage: 'internal-review',
    date: '2024-01-15T11:30:00Z',
    status: 'needs-edits',
    content: `This quarter's engineering hires reflect our commitment to bringing in young, energetic talent from top-tier universities. Our developer community tends to attract a certain type of builder — driven, competitive, technically rigorous — who thrives in fast-paced startup environments. We're excited to be growing our team of go-getters and self-starters. For non-technical readers, we've also included a simpler summary at the bottom of this email.`,
    contextTags: ['ai-assisted', 'customer-facing'],
    overallScore: 62,
    riskLabel: 'high',
    categoryScores: { claims: 10, privacy: 5, bias: 88, testimonial: 5, citation: 15 },
    flags: [
      { type: 'bias', severity: 'high', snippet: 'young, energetic talent from top-tier universities', why: 'Age-based framing ("young, energetic") in hiring language can imply age discrimination. "Top-tier universities" signals socioeconomic exclusion.', action: 'Replace with skills-based language. Remove university-tier framing.' },
      { type: 'bias', severity: 'high', snippet: 'a certain type of builder — driven, competitive, technically rigorous', why: 'Persona framing that may implicitly exclude neurodiverse individuals, caregivers, or people with different work styles.', action: 'Reframe around observable competencies rather than personality archetypes.' },
      { type: 'bias', severity: 'medium', snippet: 'go-getters and self-starters', why: 'Culture-fit language that may discourage applicants who don\'t fit a narrow cultural archetype.', action: 'Review for inclusivity with HR/Brand reviewer before sending.' },
      { type: 'bias', severity: 'medium', snippet: 'For non-technical readers, we\'ve also included a simpler summary', why: '"Non-technical" and "simpler" can read as othering or condescending to a segment of your audience.', action: 'Reframe as "executive summary" or "summary for all readers."' },
    ],
    reviewers: { required: ['Editor', 'Brand Reviewer', 'Content Lead'], escalation: [] },
    actions: [
      'Remove age-adjacent language ("young, energetic") from the hiring section.',
      'Replace university-prestige framing with skills-based hiring language.',
      'Rewrite persona description to be inclusive of diverse work styles.',
      'Change "simpler summary" to "summary for all readers" or "executive summary."',
      'Route to HR/Brand reviewer before send.'
    ],
    user: 'Priya Nair',
    notes: '',
  },
  {
    id: 'RVW-2024-004',
    title: 'Case Study: Enterprise Client Transformation',
    contentType: 'case-study',
    channel: 'website',
    workflowStage: 'pre-publish',
    date: '2024-01-14T16:44:00Z',
    status: 'needs-human',
    content: `When GlobalTech Inc. first came to us, they were struggling with a fragmented data infrastructure that cost them $2.4M annually in inefficiencies. CEO Rachel Huang described it as "a complete nightmare." After a 6-week implementation, GlobalTech's operations director said the results exceeded every expectation. The client saw 67% reduction in processing time and revenue increased by $800K in Q1. Their CTO, David Park (david.park@globaltech.com), was thrilled with the onboarding experience. We continue to partner with GlobalTech across 12 markets.`,
    contextTags: ['customer-facing', 'includes-stats', 'customer-quote'],
    overallScore: 79,
    riskLabel: 'high',
    categoryScores: { claims: 68, privacy: 92, bias: 8, testimonial: 82, citation: 55 },
    flags: [
      { type: 'privacy', severity: 'critical', snippet: 'David Park (david.park@globaltech.com)', why: 'Personal email address included in draft content. This is personal data under GDPR/CCPA and must not appear in published content without explicit consent.', action: 'Immediately remove the email address. Escalate to Content Ops + Privacy/Compliance.' },
      { type: 'testimonial', severity: 'high', snippet: 'CEO Rachel Huang described it as "a complete nightmare"', why: 'Named executive quote requires written approval from the individual and their company\'s legal/PR team before publication.', action: 'Confirm written consent from Rachel Huang and GlobalTech legal.' },
      { type: 'testimonial', severity: 'high', snippet: 'operations director said the results exceeded every expectation', why: 'Unattributed quote-style claim from a named client company. Attribution is unclear and consent is unverified.', action: 'Either get named attribution with approval or remove the quote.' },
      { type: 'claims', severity: 'high', snippet: '$2.4M annually in inefficiencies... 67% reduction in processing time and revenue increased by $800K', why: 'Specific financial metrics require client verification and written approval to publish. These are material claims about business outcomes.', action: 'Confirm all financial figures with GlobalTech and get written approval.' },
      { type: 'citation', severity: 'medium', snippet: 'GlobalTech Inc.', why: 'Company name usage in case studies typically requires a formal partnership or approval agreement.', action: 'Confirm GlobalTech has signed a case study participation agreement.' },
    ],
    reviewers: { required: ['Editor', 'Customer Marketing', 'PMM'], escalation: ['Legal/Compliance', 'Content Ops'] },
    actions: [
      'URGENT: Remove david.park@globaltech.com immediately — personal data exposure.',
      'Confirm written case study approval agreement from GlobalTech legal/PR.',
      'Get written consent from Rachel Huang for the attributed quote.',
      'Verify all financial metrics ($2.4M, 67%, $800K) are approved for publication.',
      'Clarify attribution for "operations director" quote or remove it.'
    ],
    user: 'Sarah Malone',
    notes: '',
  },
  {
    id: 'RVW-2024-005',
    title: 'Twitter/X Thought Leadership Post',
    contentType: 'social',
    channel: 'social',
    workflowStage: 'pre-publish',
    date: '2024-01-13T08:15:00Z',
    status: 'approved',
    content: `Most companies are still operating with a 2015 mindset. The data is clear: high-performing teams are 5x more agile than their peers. That's not an opinion — it's a fact. If your team isn't shipping weekly, you're already falling behind. The research is undeniable. Slow = dead in 2024.`,
    contextTags: ['ai-assisted', 'includes-stats'],
    overallScore: 56,
    riskLabel: 'medium',
    categoryScores: { claims: 70, privacy: 0, bias: 25, testimonial: 0, citation: 80 },
    flags: [
      { type: 'citation', severity: 'high', snippet: 'high-performing teams are 5x more agile than their peers', why: '"5x more agile" is a specific comparative claim. "The data is clear" and "The research is undeniable" are vague authority signals without a source.', action: 'Link to source or rephrase as opinion/perspective.' },
      { type: 'claims', severity: 'medium', snippet: "That's not an opinion — it's a fact", why: 'Framing a claim as fact elevates its perceived authority. Without a source, this can mislead.', action: 'Either source the claim or reframe as "In our experience..." or "Based on [study]..."' },
      { type: 'bias', severity: 'low', snippet: "Slow = dead in 2024", why: 'Absolutist framing that may alienate slower-growth businesses, bootstrapped teams, or regulated industries where speed isn\'t the primary metric.', action: 'Consider softening or reframing for audience inclusivity.' },
    ],
    reviewers: { required: ['Editor'], escalation: [] },
    actions: [
      'Add source link for the "5x more agile" statistic.',
      'Soften "That\'s a fact" to acknowledge it\'s a cited claim, not universal truth.',
      'Review "Slow = dead" framing for tone-of-voice alignment.'
    ],
    user: 'Maya Chen',
    notes: 'Approved by Editor with minor edits on Jan 14. Source added for 5x claim.',
  },
  {
    id: 'RVW-2024-006',
    title: 'Paid Search Ad — CRM Software',
    contentType: 'paid-ad',
    channel: 'paid-search',
    workflowStage: 'final-approval',
    date: '2024-01-12T13:20:00Z',
    status: 'needs-human',
    content: `Eliminate Your CRM Headaches Today. Rated #1 by 10,000+ Users. Start free — No credit card. Try the CRM that's guaranteed to increase your close rate by 40%. Loved by sales teams everywhere. Award-winning platform. Money-back guarantee if you're not completely satisfied within 14 days.`,
    contextTags: ['customer-facing', 'includes-stats', 'comparative'],
    overallScore: 83,
    riskLabel: 'critical',
    categoryScores: { claims: 90, privacy: 0, bias: 5, testimonial: 55, citation: 75 },
    flags: [
      { type: 'claims', severity: 'critical', snippet: 'guaranteed to increase your close rate by 40%', why: 'Specific outcome guarantee in a paid advertisement. High FTC exposure — specific performance guarantees in ads require substantiation.', action: 'Route to Legal/Compliance before live. Remove guarantee or provide disclosed substantiation.' },
      { type: 'claims', severity: 'high', snippet: 'Rated #1 by 10,000+ Users', why: '"Rated #1" claim requires a named, verified source. Self-administered ratings without third-party verification are potentially deceptive.', action: 'Cite the rating source (G2, Capterra, etc.) or reframe as "Loved by 10,000+ users."' },
      { type: 'testimonial', severity: 'medium', snippet: 'Loved by sales teams everywhere', why: 'Implied broad endorsement without attribution. "Everywhere" is an unverifiable claim.', action: 'Replace with specific attributed testimonials or soften to "Trusted by leading sales teams."' },
      { type: 'claims', severity: 'medium', snippet: 'Award-winning platform', why: 'Unspecified award claim. Readers cannot verify which award, by whom, or when.', action: 'Specify the award: "Winner: [Award Name] 2024" with a link to the source.' },
    ],
    reviewers: { required: ['PMM', 'Legal/Compliance'], escalation: ['Legal/Compliance'] },
    actions: [
      'STOP PUBLISH: Performance guarantee requires Legal/Compliance sign-off.',
      'Verify "#1 rated" claim with a named third-party source.',
      'Specify the award and link to the source.',
      'Replace "Loved by sales teams everywhere" with attributed quotes.'
    ],
    user: 'James Okafor',
    notes: '',
  },
  {
    id: 'RVW-2024-007',
    title: 'Founder LinkedIn Article — Future of AI',
    contentType: 'founder',
    channel: 'linkedin',
    workflowStage: 'internal-review',
    date: '2024-01-11T10:00:00Z',
    status: 'needs-human',
    content: `I've spent 15 years building in this space, and I can tell you with absolute certainty: the companies that don't adopt AI within the next 18 months won't survive. I've personally watched dozens of legacy businesses collapse because they moved too slow. At our company, we've already replaced 30% of manual workflows with AI and our team is happier and more productive than ever. The data doesn't lie: AI-first teams outperform by every metric that matters. Trust me on this.`,
    contextTags: ['ai-assisted', 'customer-facing', 'founder-voice'],
    overallScore: 67,
    riskLabel: 'high',
    categoryScores: { claims: 72, privacy: 10, bias: 30, testimonial: 58, citation: 68 },
    flags: [
      { type: 'claims', severity: 'high', snippet: 'companies that don\'t adopt AI within the next 18 months won\'t survive', why: 'Extreme predictive certainty claim. If wrong, this can damage credibility and alienate non-AI customers. "Absolute certainty" elevates legal/brand risk.', action: 'Soften to "may face significant disadvantages" or frame as opinion, not prediction.' },
      { type: 'claims', severity: 'high', snippet: 'we\'ve already replaced 30% of manual workflows with AI', why: 'Internal operational claim that requires accuracy verification and may have IP or competitive sensitivity.', action: 'Verify the 30% figure with internal data. Consider whether this should be public.' },
      { type: 'testimonial', severity: 'medium', snippet: 'our team is happier and more productive than ever', why: 'Implied employee endorsement without methodology. Could conflict with employee privacy expectations.', action: 'Frame as observation or cite an internal survey.' },
      { type: 'citation', severity: 'medium', snippet: 'The data doesn\'t lie: AI-first teams outperform by every metric that matters', why: 'Vague authority claim ("the data") without source attribution.', action: 'Link to specific research or reframe as founder opinion.' },
      { type: 'bias', severity: 'medium', snippet: 'companies that don\'t adopt AI...won\'t survive', why: 'Absolutist framing may alienate diverse business models, regulated industries, or companies in markets where AI adoption is constrained.', action: 'Consider adding nuance for different industry contexts.' },
    ],
    reviewers: { required: ['Editorial Lead', 'PMM'], escalation: ['Founder/Exec Reviewer'] },
    actions: [
      'Route to Founder/Exec Reviewer for final approval per governance policy.',
      'Soften "absolute certainty" survival prediction to opinion framing.',
      'Verify and disclose basis for the 30% workflow replacement claim.',
      'Add source or reframe "The data doesn\'t lie" as perspective.',
      'Consider adding industry-specific nuance to survival claim.'
    ],
    user: 'Tom Yates',
    notes: '',
  },
  {
    id: 'RVW-2024-008',
    title: 'Customer Onboarding Email Sequence',
    contentType: 'email',
    channel: 'email',
    workflowStage: 'pre-publish',
    date: '2024-01-10T09:45:00Z',
    status: 'approved',
    content: `Hi [First Name], welcome to the platform! Based on your company profile at MedTech Solutions, we've customized this experience for healthcare compliance needs. As a team working with protected health information, you'll appreciate our HIPAA-compliant data handling. We've also noted that your previous provider was DataSync Inc. — rest assured our migration tools handle this seamlessly. Looking forward to growing with you and MedTech Solutions.`,
    contextTags: ['customer-facing', 'regulated'],
    overallScore: 38,
    riskLabel: 'medium',
    categoryScores: { claims: 20, privacy: 68, bias: 5, testimonial: 5, citation: 15 },
    flags: [
      { type: 'privacy', severity: 'high', snippet: 'your company profile at MedTech Solutions...working with protected health information', why: 'References customer company name and infers specific data handling context (PHI/HIPAA). This level of personalization should be privacy-reviewed for compliance with data use agreements.', action: 'Confirm the use of company-specific profiling is within the consented data use scope.' },
      { type: 'privacy', severity: 'medium', snippet: 'your previous provider was DataSync Inc.', why: 'Referencing a customer\'s prior vendor may expose sensitive business information obtained during sales. Confirm this data was disclosed by the customer and is appropriate to reference.', action: 'Verify this information was directly disclosed by the customer, not inferred from third-party data.' },
    ],
    reviewers: { required: ['Content Ops', 'Editor'], escalation: ['Legal/Compliance'] },
    actions: [
      'Confirm HIPAA-compliant personalization is within consented data scope.',
      'Verify "DataSync Inc." reference was customer-disclosed, not sourced from intelligence tools.',
      'Review with Legal/Compliance for regulated sector (healthcare) content.'
    ],
    user: 'Priya Nair',
    notes: 'Approved with Legal note: HIPAA compliance confirmed. DataSync reference removed.',
  },
  {
    id: 'RVW-2024-009',
    title: 'Product Feature Announcement Post',
    contentType: 'product',
    channel: 'website',
    workflowStage: 'pre-publish',
    date: '2024-01-09T15:30:00Z',
    status: 'scanned',
    content: `Introducing Smart Insights — our most powerful feature yet. Built on breakthrough AI technology that processes data 10x faster than any competitor solution. Teams using Smart Insights report saving an average of 12 hours per week. The feature is completely intuitive with zero learning curve, perfect for enterprise teams and individual contributors alike.`,
    contextTags: ['customer-facing', 'includes-stats', 'comparative'],
    overallScore: 58,
    riskLabel: 'medium',
    categoryScores: { claims: 75, privacy: 0, bias: 8, testimonial: 35, citation: 65 },
    flags: [
      { type: 'claims', severity: 'high', snippet: 'processes data 10x faster than any competitor solution', why: 'Comparative performance claim ("10x faster than any competitor") requires a disclosed methodology, benchmark source, and defined comparison set.', action: 'Add benchmark source or remove the comparative claim. Route to PMM + Legal.' },
      { type: 'citation', severity: 'high', snippet: 'Teams using Smart Insights report saving an average of 12 hours per week', why: 'Specific quantitative claim (12 hrs/wk). "Teams report" implies survey data — cite the study, sample size, and methodology.', action: 'Cite the internal survey or third-party study this metric comes from.' },
      { type: 'claims', severity: 'medium', snippet: 'zero learning curve, completely intuitive', why: 'Absolute usability claim without qualification. User experiences vary; "zero learning curve" can create expectation misalignment.', action: 'Replace with qualified language: "designed for easy onboarding" or "minimal setup required."' },
    ],
    reviewers: { required: ['PMM', 'Editor'], escalation: [] },
    actions: [
      'Source or remove the "10x faster" comparative claim.',
      'Add citation for the 12 hrs/week productivity figure.',
      'Soften "zero learning curve" to qualified language.',
      'Route to PMM before publish for competitive claims review.'
    ],
    user: 'Maya Chen',
    notes: '',
  },
  {
    id: 'RVW-2024-010',
    title: 'Help Center Article — Data Security FAQ',
    contentType: 'help-doc',
    channel: 'help',
    workflowStage: 'early-draft',
    date: '2024-01-08T11:00:00Z',
    status: 'needs-edits',
    content: `Your data is completely safe with us. We use military-grade encryption that makes it impossible for anyone to access your data without permission. We will never share your data with third parties under any circumstances. Our security is 100% bulletproof and has never been breached. If you have any concerns, rest assured that our platform is the safest choice you can make.`,
    contextTags: ['customer-facing', 'regulated'],
    overallScore: 45,
    riskLabel: 'medium',
    categoryScores: { claims: 88, privacy: 5, bias: 0, testimonial: 0, citation: 40 },
    flags: [
      { type: 'claims', severity: 'high', snippet: '100% bulletproof and has never been breached', why: 'Absolute security guarantee is factually risky — no platform can legitimately claim zero breach history in perpetuity, and this may create legal liability if breached.', action: 'Remove absolute security claims. Use factual, qualified statements about security posture.' },
      { type: 'claims', severity: 'high', snippet: 'military-grade encryption that makes it impossible for anyone to access your data', why: '"Military-grade" is vague marketing language, and "impossible" is an absolute claim that creates contractual/legal risk.', action: 'Specify the actual encryption standard (e.g., AES-256) and remove "impossible."' },
      { type: 'claims', severity: 'medium', snippet: 'We will never share your data with third parties under any circumstances', why: '"Never...under any circumstances" contradicts standard legal disclosure requirements (court orders, law enforcement, etc.) and may conflict with your actual privacy policy.', action: 'Align with actual privacy policy language. Include standard exceptions.' },
    ],
    reviewers: { required: ['Editor', 'Content Ops'], escalation: ['Legal/Compliance'] },
    actions: [
      'Remove "100% bulletproof" — replace with specific security certifications (SOC 2, ISO 27001).',
      'Replace "military-grade" with the actual encryption standard.',
      'Align "never share" language with the current privacy policy.',
      'Route to Legal/Compliance for accuracy review before publishing.'
    ],
    user: 'Sarah Malone',
    notes: '',
  },
];

// ============================================================
// RISK ENGINE
// ============================================================

const RISK_RULES = {
  claims: {
    patterns: [
      { regex: /\b(guaranteed?|guarantee)\b/gi, severity: 'critical', label: 'Guarantee language' },
      { regex: /\b(proven to|clinically proven|scientifically proven)\b/gi, severity: 'critical', label: 'Unsubstantiated proof claim' },
      { regex: /\b(\d+%|[0-9]+x)\b.*\b(faster|better|more|increase|reduction|boost|improve)/gi, severity: 'high', label: 'Quantitative performance claim' },
      { regex: /\b(eliminate[s]?|eliminat(es|ing))\b.*\b(entirely|completely|all)\b/gi, severity: 'high', label: 'Absolute outcome claim' },
      { regex: /\b(best|#1|number one|most innovative|industry.leading|world.class|market.leading)\b/gi, severity: 'high', label: 'Superlative claim' },
      { regex: /\b(100%|zero risk|completely safe|fully secure|bulletproof|impossible)\b/gi, severity: 'high', label: 'Absolute certainty claim' },
      { regex: /\b(will never|never fail|always work|always succeed)\b/gi, severity: 'high', label: 'Absolute promise' },
      { regex: /\b(award.winning|as seen in|featured in)\b/gi, severity: 'medium', label: 'Unverified accolade' },
    ]
  },
  privacy: {
    patterns: [
      { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, severity: 'critical', label: 'Email address detected' },
      { regex: /\b(\d{3}[-.]?\d{3}[-.]?\d{4}|\(\d{3}\)\s*\d{3}[-.]?\d{4})\b/gi, severity: 'critical', label: 'Phone number detected' },
      { regex: /\b(SSN|social security|passport|date of birth|DOB|national ID)\b/gi, severity: 'critical', label: 'Sensitive personal identifier' },
      { regex: /\b(HIPAA|PHI|protected health|patient data|medical record)\b/gi, severity: 'high', label: 'Healthcare data reference' },
      { regex: /\b(confidential|internal only|proprietary|trade secret|NDA)\b/gi, severity: 'high', label: 'Confidentiality marker in draft' },
      { regex: /\b(customer name[s]?|client name[s]?)\b.*\binclude[sd]?\b/gi, severity: 'medium', label: 'Customer name reference' },
    ]
  },
  bias: {
    patterns: [
      { regex: /\b(young|youthful|energetic)\b.*\b(talent|hire[s]?|team|candidate)/gi, severity: 'high', label: 'Age-coded hiring language' },
      { regex: /\b(top.tier universities|ivy league|elite schools)\b/gi, severity: 'high', label: 'Exclusionary credential framing' },
      { regex: /\b(manpower|mankind|man-hours|chairman|stewardess|fireman)\b/gi, severity: 'medium', label: 'Gendered language' },
      { regex: /\b(go.getter|rockstar|ninja|wizard|hustle|grind|tribe|guru)\b/gi, severity: 'medium', label: 'Exclusionary culture jargon' },
      { regex: /\b(crazy|insane|lame|blind spot|stand on its own)\b/gi, severity: 'medium', label: 'Potentially ableist language' },
      { regex: /\b(simpler|dumb it down|non.technical|layman)\b/gi, severity: 'low', label: 'Condescending framing' },
    ]
  },
  testimonial: {
    patterns: [
      { regex: /[""][^""]{10,}[""]/gi, severity: 'high', label: 'Quote-style content detected' },
      { regex: /\b(said|told us|told me|explained|shared with us)\b.*["']/gi, severity: 'high', label: 'Attributed quote pattern' },
      { regex: /\b(customers? (say|report|love|told|agree))\b/gi, severity: 'medium', label: 'Implied customer endorsement' },
      { regex: /\b(loved by|trusted by|used by|adopted by) .{3,30}( everywhere| millions| thousands| all)\b/gi, severity: 'medium', label: 'Broad endorsement claim' },
      { regex: /\b(I (personally|myself|have|was))\b/gi, severity: 'low', label: 'First-person lived experience language' },
    ]
  },
  citation: {
    patterns: [
      { regex: /\b(studies show|research shows|research suggests|data shows|data indicates|experts say|experts agree)\b/gi, severity: 'high', label: 'Vague authority claim' },
      { regex: /\b(the data (is clear|doesn.t lie|proves|shows))\b/gi, severity: 'high', label: 'Unattributed data claim' },
      { regex: /\b(\d+%)\b(?!.*source|.*\[|.*citation|.*according to|.*per )/gi, severity: 'high', label: 'Unsourced percentage stat' },
      { regex: /\b([0-9]+x (more|better|faster|higher|lower|less))\b/gi, severity: 'high', label: 'Unsourced comparative multiplier' },
      { regex: /\b(industry (standard|trend|best practice|average|benchmark))\b(?!.*source|.*per |.*according)/gi, severity: 'medium', label: 'Unverified industry claim' },
      { regex: /\b(according to (experts|analysts|researchers|industry))\b(?!.*named|.*from |.*at )/gi, severity: 'medium', label: 'Unattributed expert reference' },
    ]
  }
};

// Context weighting — risk amplifiers
const CONTEXT_MULTIPLIERS = {
  contentType: {
    'paid-ad':    1.4,
    landing:      1.3,
    product:      1.2,
    founder:      1.2,
    'case-study': 1.15,
    email:        1.1,
    social:       1.05,
    blog:         1.0,
    'help-doc':   0.95,
    sales:        1.1,
  },
  workflowStage: {
    'final-approval': 1.3,
    'pre-publish':    1.2,
    'internal-review':1.0,
    'early-draft':    0.85,
    'post-pub':       1.15,
  },
  tags: {
    'regulated':       1.25,
    'customer-facing': 1.15,
    'founder-voice':   1.2,
    'comparative':     1.15,
    'includes-stats':  1.1,
    'customer-quote':  1.15,
    'sensitive-audience': 1.2,
  }
};

function runGovernanceScan(content, contentType, channel, workflowStage, contextTags) {
  const flags = [];
  const categoryRawScores = { claims: 0, privacy: 0, bias: 0, testimonial: 0, citation: 0 };
  const config = AppState.governanceConfig || DEFAULT_CONFIG;

  // --- Pattern matching per category ---
  for (const [category, { patterns }] of Object.entries(RISK_RULES)) {
    for (const rule of patterns) {
      const matches = [...content.matchAll(rule.regex)];
      for (const match of matches) {
        const snippet = extractSnippet(content, match.index, match[0].length);
        const flag = {
          type: category,
          severity: rule.severity,
          snippet,
          label: rule.label,
          why: generateExplanation(category, rule.label, contentType),
          action: generateAction(category, rule.label, contentType, workflowStage),
        };
        if (!flags.some(f => f.snippet === snippet && f.type === category)) {
          flags.push(flag);
          categoryRawScores[category] += severityScore(rule.severity);
        }
      }
    }
  }

  // --- Watch terms ---
  for (const term of (config.watchTerms || [])) {
    const termRegex = new RegExp(escapeRegex(term), 'gi');
    const matches = [...content.matchAll(termRegex)];
    for (const match of matches) {
      const snippet = extractSnippet(content, match.index, match[0].length);
      if (!flags.some(f => f.snippet === snippet)) {
        flags.push({
          type: 'claims',
          severity: 'high',
          snippet,
          label: 'Governance watch term',
          why: `"${term}" is flagged in your organization's watch term list as high-risk language.`,
          action: 'Review with your Content Lead or Governance Owner before publishing.',
        });
        categoryRawScores.claims += 20;
      }
    }
  }

  // --- Cap and normalize category scores (0–100) ---
  const categoryScores = {};
  for (const [cat, raw] of Object.entries(categoryRawScores)) {
    categoryScores[cat] = Math.min(100, raw);
  }

  // --- Context multipliers ---
  let typeMultiplier = CONTEXT_MULTIPLIERS.contentType[contentType] || 1.0;
  let stageMultiplier = CONTEXT_MULTIPLIERS.workflowStage[workflowStage] || 1.0;
  let tagMultiplier = 1.0;
  for (const tag of contextTags) {
    tagMultiplier = Math.max(tagMultiplier, CONTEXT_MULTIPLIERS.tags[tag] || 1.0);
  }

  // --- Weighted overall score ---
  const weights = { claims: 0.30, citation: 0.25, testimonial: 0.20, privacy: 0.15, bias: 0.10 };
  let weightedRaw = 0;
  for (const [cat, w] of Object.entries(weights)) {
    weightedRaw += (categoryScores[cat] || 0) * w;
  }
  const contextFactor = (typeMultiplier + stageMultiplier + tagMultiplier) / 3;
  let overallScore = Math.round(Math.min(100, weightedRaw * contextFactor));

  const thresholds = config.thresholds || DEFAULT_CONFIG.thresholds;
  let riskLabel = 'low';
  if (overallScore >= thresholds.critical) riskLabel = 'critical';
  else if (overallScore >= thresholds.high) riskLabel = 'high';
  else if (overallScore >= thresholds.medium) riskLabel = 'medium';

  // --- Review routing ---
  const reviewers = buildReviewerRouting(flags, contentType, riskLabel, config);
  const actions = buildRecommendedActions(flags, contentType, riskLabel);

  return { flags, categoryScores, overallScore, riskLabel, reviewers, actions };
}

function extractSnippet(content, index, matchLen) {
  const start = Math.max(0, index - 30);
  const end = Math.min(content.length, index + matchLen + 80);
  let snippet = content.substring(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  return snippet;
}

function severityScore(severity) {
  return { critical: 40, high: 25, medium: 15, low: 8 }[severity] || 10;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateExplanation(category, label, contentType) {
  const explanations = {
    claims: {
      'Guarantee language': `Guarantee-of-outcome language creates legal exposure, especially in ${contentTypeLabel(contentType)} content. Regulators may treat this as a deceptive trade practice if the outcome can't be substantiated.`,
      'Quantitative performance claim': `Specific numerical performance claims require a verifiable source, methodology, and disclosed sample. Without attribution, they may mislead readers about expected outcomes.`,
      'Superlative claim': `Superlative language ("best," "#1," "most innovative") is an objective claim that requires evidence. Unsubstantiated comparisons may violate advertising standards.`,
      'Absolute certainty claim': `Absolute certainty language (100%, zero, impossible) creates expectations that can't be guaranteed and may create legal liability if outcomes differ.`,
      default: `This phrase raises a claims risk flag for ${contentTypeLabel(contentType)} content. Verify it can be substantiated before publish.`,
    },
    privacy: {
      'Email address detected': `An email address is personal data under GDPR, CCPA, and most privacy regulations. Publishing it without explicit consent violates data protection requirements.`,
      'Healthcare data reference': `References to protected health information (PHI) in customer-facing content require HIPAA compliance review.`,
      default: `Potential privacy exposure detected. Review for personally identifiable information before sharing this draft externally.`,
    },
    bias: {
      'Age-coded hiring language': `Age-adjacent language in hiring or team descriptions may imply age discrimination, which violates employment law in most jurisdictions.`,
      'Exclusionary credential framing': `University prestige framing signals socioeconomic exclusion and limits the perceived audience for your brand.`,
      default: `This phrase may use exclusionary or stereotyped language. Review for inclusivity and audience impact.`,
    },
    testimonial: {
      'Quote-style content detected': `Quote-formatted content implies a real person said this. AI-generated or unverified quotes used in marketing are a FTC disclosure concern.`,
      default: `This content has characteristics of a testimonial or endorsement. Verify attribution and consent before publishing.`,
    },
    citation: {
      'Vague authority claim': `"Studies show" and similar phrases imply scientific backing without providing it. This can mislead readers about the strength of the evidence.`,
      'Unsourced percentage stat': `A specific percentage claim without a named source is unverifiable and creates risk in customer-facing content. Readers interpret statistics as factual benchmarks.`,
      default: `This appears to be an unsourced factual claim. Add attribution or verify before publishing.`,
    },
  };

  const catMap = explanations[category];
  return catMap?.[label] || catMap?.default || `This content triggered a ${category} risk flag during review.`;
}

function generateAction(category, label, contentType, workflowStage) {
  const isHighStake = ['paid-ad', 'landing', 'product', 'founder'].includes(contentType);
  const isLateStage = ['pre-publish', 'final-approval'].includes(workflowStage);

  const actions = {
    claims: isHighStake
      ? 'Route to Legal/Compliance and PMM. Do not publish without sign-off on this claim.'
      : 'Add source citation or qualify the language. Flag for editor review.',
    privacy: 'Remove or redact immediately. Escalate to Content Ops + Privacy/Compliance.',
    bias: 'Rewrite using inclusive language. Route to Brand Reviewer or HR for review.',
    testimonial: 'Confirm written consent from the quoted party via Customer Marketing before publishing.',
    citation: isLateStage
      ? 'Add named source citation before final approval. Cannot publish with unattributed stats.'
      : 'Add a source or note where the data comes from for the editor review.',
  };
  return actions[category] || 'Flag for human review before publishing.';
}

function contentTypeLabel(contentType) {
  const labels = {
    'paid-ad': 'paid advertising', landing: 'landing page', product: 'product page',
    blog: 'blog post', email: 'email', social: 'social media', 'case-study': 'case study',
    'help-doc': 'help documentation', sales: 'sales collateral', founder: 'founder/executive content',
  };
  return labels[contentType] || 'this content type';
}

function buildReviewerRouting(flags, contentType, riskLabel, config) {
  const mapping = (config.reviewerMappings || DEFAULT_CONFIG.reviewerMappings)[contentType] || ['Editor'];
  const required = [...new Set(mapping)];
  const escalation = [];

  if (riskLabel === 'critical') escalation.push('Legal/Compliance');
  if (flags.some(f => f.type === 'privacy' && f.severity === 'critical')) escalation.push('Privacy/Compliance', 'Content Ops');
  if (flags.some(f => f.type === 'testimonial' && f.severity === 'high')) {
    if (!required.includes('Customer Marketing')) required.push('Customer Marketing');
  }
  if (flags.some(f => f.type === 'claims' && f.severity === 'critical')) {
    if (!escalation.includes('Legal/Compliance')) escalation.push('Legal/Compliance');
  }
  if (contentType === 'founder') {
    if (!escalation.includes('Founder/Exec Reviewer')) escalation.push('Founder/Exec Reviewer');
  }

  return { required: [...new Set(required)], escalation: [...new Set(escalation)] };
}

function buildRecommendedActions(flags, contentType, riskLabel) {
  const actions = [];
  if (riskLabel === 'critical') {
    actions.push('🚨 STOP PUBLISH: This content requires Legal/Compliance review before going live.');
  }
  const privacyCritical = flags.filter(f => f.type === 'privacy' && f.severity === 'critical');
  if (privacyCritical.length > 0) {
    actions.push('Remove all personal data (email addresses, phone numbers, identifiers) immediately.');
  }
  const claimsCritical = flags.filter(f => f.type === 'claims' && (f.severity === 'critical' || f.severity === 'high'));
  if (claimsCritical.length > 0) {
    actions.push('Add verifiable source citations for all performance and outcome claims.');
  }
  const citationFlags = flags.filter(f => f.type === 'citation');
  if (citationFlags.length > 0) {
    actions.push('Replace vague authority language ("studies show", "data confirms") with named, linked sources.');
  }
  const testimonialFlags = flags.filter(f => f.type === 'testimonial' && f.severity !== 'low');
  if (testimonialFlags.length > 0) {
    actions.push('Confirm written consent for all quoted or attributed individuals before publishing.');
  }
  const biasFlags = flags.filter(f => f.type === 'bias' && f.severity !== 'low');
  if (biasFlags.length > 0) {
    actions.push('Rewrite flagged sections using inclusive, skills-based language. Route to Brand Reviewer.');
  }
  if (actions.length === 0) {
    actions.push('Review flagged passages with your editor and address each recommendation.');
    actions.push('Complete the required review path before marking content as approved.');
  }
  return actions;
}

// ============================================================
// REVIEW STATE & PERSISTENCE (localStorage)
// ============================================================

function loadState() {
  try {
    const saved = localStorage.getItem('airc_reviews');
    AppState.reviews = saved ? JSON.parse(saved) : [...SAMPLE_REVIEWS];
    const savedConfig = localStorage.getItem('airc_config');
    AppState.governanceConfig = savedConfig ? JSON.parse(savedConfig) : { ...DEFAULT_CONFIG };
  } catch (e) {
    AppState.reviews = [...SAMPLE_REVIEWS];
    AppState.governanceConfig = { ...DEFAULT_CONFIG };
  }
}

function saveState() {
  try {
    localStorage.setItem('airc_reviews', JSON.stringify(AppState.reviews));
    localStorage.setItem('airc_config', JSON.stringify(AppState.governanceConfig));
  } catch (e) {}
}

function generateReviewId() {
  const year = new Date().getFullYear();
  const next = AppState.reviews.length + 1;
  return `RVW-${year}-${String(next).padStart(3, '0')}`;
}

// ============================================================
// NAVIGATION
// ============================================================

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById(`view-${viewName}`);
  const navItem = document.querySelector(`[data-view="${viewName}"]`);

  if (view) view.classList.add('active');
  if (navItem) navItem.classList.add('active');

  AppState.currentView = viewName;

  // Render the view
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'audit-log') renderAuditLog();
  if (viewName === 'governance') renderGovernanceSettings();
  if (viewName === 'results' && AppState.currentReview) renderResults(AppState.currentReview);

  document.querySelector('.main-content').scrollTo(0, 0);
}

// ============================================================
// DASHBOARD RENDERING
// ============================================================

function renderDashboard() {
  const reviews = AppState.reviews;
  const highCritical = reviews.filter(r => r.riskLabel === 'high' || r.riskLabel === 'critical').length;
  const pending = reviews.filter(r => ['scanned', 'needs-human', 'needs-edits', 'escalated'].includes(r.status)).length;
  const topRisk = getTopRiskCategory(reviews);

  document.getElementById('stat-total').textContent = reviews.length;
  document.getElementById('stat-high').textContent = highCritical;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-top-risk').textContent = topRisk;

  const container = document.getElementById('recent-reviews-list');
  const recent = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">No reviews yet</div><p class="empty-state-desc">Run your first content review to see results here.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="review-table">
      <div class="review-row review-row-header">
        <div class="col-header">Content</div>
        <div class="col-header">Type</div>
        <div class="col-header">Date</div>
        <div class="col-header">Risk Level</div>
        <div class="col-header">Status</div>
        <div class="col-header">Score</div>
      </div>
      ${recent.map(r => `
        <div class="review-row" onclick="openReviewDetail('${r.id}')">
          <div>
            <div class="review-title">${escapeHtml(r.title)}</div>
            <div class="review-meta">${r.id} · ${r.user || 'Unknown'}</div>
          </div>
          <div><span class="review-meta">${contentTypeLabel(r.contentType)}</span></div>
          <div class="review-date">${formatDate(r.date)}</div>
          <div><span class="risk-badge ${r.riskLabel}">${capitalize(r.riskLabel)}</span></div>
          <div><span class="status-badge status-${r.status}">${statusLabel(r.status)}</span></div>
          <div style="font-weight:700;color:${scoreColor(r.overallScore)}">${r.overallScore}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function getTopRiskCategory(reviews) {
  const totals = { claims: 0, privacy: 0, bias: 0, testimonial: 0, citation: 0 };
  for (const r of reviews) {
    if (r.categoryScores) {
      for (const [cat, score] of Object.entries(r.categoryScores)) {
        totals[cat] = (totals[cat] || 0) + score;
      }
    }
  }
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  return top ? capitalize(top[0]) + ' Risk' : 'N/A';
}

// ============================================================
// NEW REVIEW — INPUT HANDLING
// ============================================================

function updateCharCount() {
  const content = document.getElementById('content-input').value;
  document.getElementById('char-count').textContent = `${content.length.toLocaleString()} characters`;
}

function getSelectedTags() {
  return [...document.querySelectorAll('#context-tags input:checked')].map(el => el.value);
}

function loadSampleContent() {
  const samples = [
    {
      text: `Our platform has helped over 10,000 teams boost productivity by 47% on average, with some customers reporting up to 80% reduction in manual work. Unlike legacy solutions, our AI-powered automation is proven to eliminate bottlenecks entirely. Sarah from Acme Corp said "This completely changed how our team operates." Studies show that companies using automation tools see 3x higher revenue growth.`,
      type: 'blog', channel: 'website', stage: 'pre-publish', tags: ['ai-assisted', 'customer-facing', 'includes-stats', 'customer-quote']
    },
    {
      text: `Guaranteed results in 30 days or your money back. Our clinically validated approach to B2B sales acceleration has been adopted by Fortune 500 leaders. We guarantee you'll close 2x more deals. Join 50,000+ companies that have transformed their revenue. Zero risk, total reward.`,
      type: 'paid-ad', channel: 'paid-social', stage: 'final-approval', tags: ['customer-facing', 'includes-stats', 'comparative']
    },
    {
      text: `This quarter's engineering hires reflect our commitment to bringing in young, energetic talent from top-tier universities. Our developer community tends to attract a certain type of builder — driven, competitive, technically rigorous. For non-technical readers, we've also included a simpler summary.`,
      type: 'email', channel: 'email', stage: 'internal-review', tags: ['ai-assisted']
    },
    {
      text: `When GlobalTech Inc. came to us, they were struggling with issues costing them $2.4M annually. CEO Rachel Huang described it as "a complete nightmare." Their CTO, David Park (david.park@globaltech.com), was thrilled with the onboarding. They saw 67% reduction in processing time and $800K revenue increase in Q1.`,
      type: 'case-study', channel: 'website', stage: 'pre-publish', tags: ['customer-facing', 'includes-stats', 'customer-quote']
    },
  ];

  const sample = samples[Math.floor(Math.random() * samples.length)];
  document.getElementById('content-input').value = sample.text;
  document.getElementById('content-type').value = sample.type;
  document.getElementById('channel').value = sample.channel;
  document.getElementById('workflow-stage').value = sample.stage;

  document.querySelectorAll('#context-tags input').forEach(el => {
    el.checked = sample.tags.includes(el.value);
  });

  updateCharCount();
  showToast('Sample content loaded. Review the context settings, then run the scan.', 'success');
}

// ============================================================
// SCAN EXECUTION
// ============================================================

function runScan() {
  const content = document.getElementById('content-input').value.trim();
  if (!content || content.length < 20) {
    showToast('Please paste at least 20 characters of content to scan.', 'error');
    return;
  }

  const contentType = document.getElementById('content-type').value;
  const channel = document.getElementById('channel').value;
  const workflowStage = document.getElementById('workflow-stage').value;
  const contextTags = getSelectedTags();

  // Show scan overlay
  const overlay = document.getElementById('scan-overlay');
  overlay.classList.add('active');

  // Animate scan steps
  const steps = [1, 2, 3, 4, 5, 6];
  let currentStep = 0;

  function advanceStep() {
    if (currentStep > 0) {
      const prevDot = document.querySelector(`#step-${currentStep} .step-dot`);
      if (prevDot) { prevDot.classList.remove('active'); prevDot.classList.add('done'); }
    }
    currentStep++;
    if (currentStep <= steps.length) {
      const dot = document.querySelector(`#step-${currentStep} .step-dot`);
      if (dot) dot.classList.add('active');
      setTimeout(advanceStep, 420 + Math.random() * 300);
    } else {
      // All steps done — run actual scan
      setTimeout(() => {
        const result = runGovernanceScan(content, contentType, channel, workflowStage, contextTags);

        // Build review record
        const review = {
          id: generateReviewId(),
          title: generateTitle(content, contentType),
          contentType,
          channel,
          workflowStage,
          date: new Date().toISOString(),
          status: result.riskLabel === 'critical' ? 'escalated' : (result.overallScore > 30 ? 'needs-human' : 'scanned'),
          content: content,
          contextTags,
          overallScore: result.overallScore,
          riskLabel: result.riskLabel,
          categoryScores: result.categoryScores,
          flags: result.flags,
          reviewers: result.reviewers,
          actions: result.actions,
          user: 'Current User',
          notes: '',
        };

        AppState.reviews.unshift(review);
        AppState.currentReview = review;
        saveState();

        // Close overlay and show results
        overlay.classList.remove('active');
        resetScanSteps();
        switchView('results');
      }, 300);
    }
  }

  setTimeout(advanceStep, 300);
}

function resetScanSteps() {
  document.querySelectorAll('.step-dot').forEach(dot => {
    dot.classList.remove('active', 'done');
  });
}

function generateTitle(content, contentType) {
  const firstLine = content.split(/[.\n]/)[0].trim().substring(0, 50);
  return firstLine ? `${contentTypeLabel(contentType)}: ${firstLine}...` : `${contentTypeLabel(contentType)} Review`;
}

// ============================================================
// RESULTS RENDERING
// ============================================================

function renderResults(review) {
  if (!review) return;

  document.getElementById('results-subtitle').textContent =
    `${review.id} · ${contentTypeLabel(review.contentType)} · ${formatDate(review.date)}`;

  // Score ring
  const score = review.overallScore;
  const circumference = 2 * Math.PI * 50; // ≈ 314
  const dashOffset = circumference - (circumference * score / 100);
  const ring = document.getElementById('ring-fill');
  if (ring) {
    ring.style.stroke = scoreColor(score);
    setTimeout(() => { ring.style.strokeDashoffset = dashOffset; }, 100);
  }

  const scoreDisplay = document.getElementById('overall-score-display');
  if (scoreDisplay) scoreDisplay.textContent = score;

  const riskBadge = document.getElementById('risk-label-badge');
  if (riskBadge) {
    riskBadge.textContent = capitalize(review.riskLabel) + ' Risk';
    riskBadge.className = `risk-badge-lg risk-badge ${review.riskLabel}`;
  }

  const scoreDesc = document.getElementById('score-description');
  if (scoreDesc) {
    const descriptions = {
      low: 'Minor issues detected. Writer-level fixes recommended.',
      medium: 'Moderate risk. Editor and content lead review required.',
      high: 'Significant risk. PMM and legal involvement recommended.',
      critical: 'Critical risk. Stop publish. Escalate immediately.'
    };
    scoreDesc.textContent = descriptions[review.riskLabel] || '';
  }

  const reviewIdDisplay = document.getElementById('review-id-display');
  if (reviewIdDisplay) reviewIdDisplay.textContent = review.id;

  // Category scores
  renderCategoryScores(review.categoryScores);

  // Reviewer routing
  renderReviewerRouting(review.reviewers);

  // Flagged passages
  renderFlaggedPassages(review.flags);

  // Recommended actions
  renderRecommendedActions(review.actions);

  // Flag count
  const flagCountEl = document.getElementById('flag-count-badge');
  if (flagCountEl) {
    flagCountEl.textContent = `${review.flags.length} flag${review.flags.length !== 1 ? 's' : ''}`;
    flagCountEl.style.display = review.flags.length > 0 ? 'block' : 'none';
  }
}

function renderCategoryScores(categoryScores) {
  const container = document.getElementById('category-scores');
  if (!container) return;

  const categories = [
    { key: 'claims', label: 'Claims Risk', color: 'var(--cat-claims)', letter: 'C', cssClass: 'claims' },
    { key: 'citation', label: 'Citation / Source Risk', color: 'var(--cat-citation)', letter: 'S', cssClass: 'citation' },
    { key: 'testimonial', label: 'Testimonial / Authenticity', color: 'var(--cat-testimonial)', letter: 'T', cssClass: 'testimonial' },
    { key: 'privacy', label: 'Privacy Risk', color: 'var(--cat-privacy)', letter: 'P', cssClass: 'privacy' },
    { key: 'bias', label: 'Bias Risk', color: 'var(--cat-bias)', letter: 'B', cssClass: 'bias' },
  ];

  container.innerHTML = categories.map(cat => {
    const score = categoryScores[cat.key] || 0;
    const riskLvl = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
    return `
      <div class="category-score-item">
        <div class="cat-score-header">
          <div class="cat-score-label">
            <div class="risk-cat-icon ${cat.cssClass}">${cat.letter}</div>
            ${cat.label}
          </div>
          <span class="cat-score-value" style="color:${cat.color}">${score}</span>
        </div>
        <div class="cat-score-bar">
          <div class="cat-score-fill" style="width:0%;background:${cat.color}" data-width="${score}%"></div>
        </div>
      </div>
    `;
  }).join('');

  // Animate bars after render
  setTimeout(() => {
    container.querySelectorAll('.cat-score-fill').forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  }, 50);
}

function renderReviewerRouting(reviewers) {
  const container = document.getElementById('reviewer-routing');
  if (!container) return;

  let html = '';
  if (reviewers.required && reviewers.required.length > 0) {
    html += `
      <div class="reviewer-section">
        <div class="reviewer-section-title">Required Reviewers</div>
        ${reviewers.required.map(r => `<span class="reviewer-chip required">👤 ${r}</span>`).join('')}
      </div>
    `;
  }
  if (reviewers.escalation && reviewers.escalation.length > 0) {
    html += `
      <div class="reviewer-section">
        <div class="reviewer-section-title">Escalation Required</div>
        ${reviewers.escalation.map(r => `<span class="reviewer-chip escalation">⚠️ ${r}</span>`).join('')}
      </div>
    `;
  }
  if (!html) {
    html = `<p style="color:var(--text-muted);font-size:13px;">Standard editor review sufficient for this risk level.</p>`;
  }

  container.innerHTML = html;
}

function renderFlaggedPassages(flags) {
  const container = document.getElementById('flagged-passages');
  if (!container) return;

  if (flags.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✓</div>
        <div class="empty-state-title">No issues detected</div>
        <p class="empty-state-desc">No significant governance risks were flagged in this content. Standard editorial review is still recommended.</p>
      </div>
    `;
    return;
  }

  const catColors = { claims: 'var(--cat-claims)', privacy: 'var(--cat-privacy)', bias: 'var(--cat-bias)', testimonial: 'var(--cat-testimonial)', citation: 'var(--cat-citation)' };
  const catLabels = { claims: 'Claims', privacy: 'Privacy', bias: 'Bias', testimonial: 'Testimonial', citation: 'Citation' };

  container.innerHTML = flags.map((flag, i) => `
    <div class="flagged-item">
      <div class="flagged-header" onclick="toggleFlag(${i})">
        <div class="flagged-header-left">
          <div class="flag-category-dot" style="background:${catColors[flag.type] || 'var(--accent-primary)'}"></div>
          <div class="flagged-title">${flag.label || capitalize(flag.type) + ' Risk'}</div>
        </div>
        <span class="risk-badge ${flag.severity}">${capitalize(flag.severity)}</span>
      </div>
      <div class="flagged-body" id="flag-body-${i}">
        <div class="flagged-quote">"${escapeHtml(flag.snippet)}"</div>
        <div class="flagged-why"><strong>Why it was flagged:</strong> ${flag.why}</div>
        <div class="flagged-action">${flag.action}</div>
      </div>
    </div>
  `).join('');

  // Auto-open first flag
  const firstBody = document.getElementById('flag-body-0');
  if (firstBody) firstBody.classList.add('open');
}

function toggleFlag(index) {
  const body = document.getElementById(`flag-body-${index}`);
  if (body) body.classList.toggle('open');
}

function renderRecommendedActions(actions) {
  const container = document.getElementById('recommended-actions');
  if (!container) return;

  if (!actions || actions.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">No specific actions required at this time.</p>`;
    return;
  }

  container.innerHTML = actions.map((action, i) => `
    <div class="action-item">
      <div class="action-number">${i + 1}</div>
      <div class="action-text">${escapeHtml(action)}</div>
    </div>
  `).join('');
}

// ============================================================
// REVIEW STATUS
// ============================================================

function updateReviewStatus() {
  // status select changed
}

function saveReviewDecision() {
  if (!AppState.currentReview) return;
  const status = document.getElementById('review-status').value;
  const notes = document.getElementById('review-notes').value;

  const reviewIdx = AppState.reviews.findIndex(r => r.id === AppState.currentReview.id);
  if (reviewIdx >= 0) {
    AppState.reviews[reviewIdx].status = status;
    AppState.reviews[reviewIdx].notes = notes;
    AppState.currentReview.status = status;
    AppState.currentReview.notes = notes;
    saveState();
    showToast('Review decision saved successfully.', 'success');
  }
}

// ============================================================
// AUDIT LOG RENDERING
// ============================================================

function renderAuditLog(filtered) {
  const reviews = filtered || [...AppState.reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  const container = document.getElementById('audit-log-list');

  if (reviews.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No reviews found</div>
        <p class="empty-state-desc">No reviews match your current filters. Try adjusting the search or filter criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="audit-table">
      <div class="audit-table-header">
        <div class="audit-col-header">Content</div>
        <div class="audit-col-header">Type</div>
        <div class="audit-col-header">Date</div>
        <div class="audit-col-header">Risk</div>
        <div class="audit-col-header">Status</div>
        <div class="audit-col-header">Score</div>
        <div class="audit-col-header">Action</div>
      </div>
      ${reviews.map(r => `
        <div class="audit-row" onclick="openReviewDetail('${r.id}')">
          <div>
            <div class="audit-title">${escapeHtml(r.title)}</div>
            <div class="audit-meta">${r.id} · ${r.user || 'Unknown'}</div>
          </div>
          <div class="audit-meta">${contentTypeLabel(r.contentType)}</div>
          <div class="audit-date">${formatDate(r.date)}</div>
          <div><span class="risk-badge ${r.riskLabel}">${capitalize(r.riskLabel)}</span></div>
          <div><span class="status-badge status-${r.status}">${statusLabel(r.status)}</span></div>
          <div class="audit-score" style="color:${scoreColor(r.overallScore)}">${r.overallScore}</div>
          <div><button class="audit-action-btn" onclick="event.stopPropagation();openReviewDetail('${r.id}')">View</button></div>
        </div>
      `).join('')}
    </div>
  `;
}

function filterAuditLog() {
  const search = document.getElementById('audit-search').value.toLowerCase();
  const riskFilter = document.getElementById('filter-risk').value;
  const statusFilter = document.getElementById('filter-status').value;
  const typeFilter = document.getElementById('filter-type').value;

  const filtered = AppState.reviews.filter(r => {
    const matchSearch = !search ||
      r.title.toLowerCase().includes(search) ||
      r.id.toLowerCase().includes(search) ||
      (r.contentType || '').toLowerCase().includes(search);
    const matchRisk = !riskFilter || r.riskLabel === riskFilter;
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchType = !typeFilter || r.contentType === typeFilter;
    return matchSearch && matchRisk && matchStatus && matchType;
  });

  renderAuditLog(filtered.sort((a, b) => new Date(b.date) - new Date(a.date)));
}

// ============================================================
// REVIEW DETAIL
// ============================================================

function openReviewDetail(reviewId) {
  const review = AppState.reviews.find(r => r.id === reviewId);
  if (!review) return;

  AppState.currentReview = review;

  const container = document.getElementById('review-detail-content');
  const catColors = { claims: 'var(--cat-claims)', privacy: 'var(--cat-privacy)', bias: 'var(--cat-bias)', testimonial: 'var(--cat-testimonial)', citation: 'var(--cat-citation)' };

  document.getElementById('detail-subtitle').textContent = `${review.id} · ${review.user || 'Unknown'} · ${formatDate(review.date)}`;

  container.innerHTML = `
    <div class="detail-grid">
      <div>
        <div class="section-card">
          <h2 class="section-title">Review Overview</h2>
          <div class="detail-meta-grid">
            <div class="detail-meta-item"><div class="detail-meta-label">Review ID</div><div class="detail-meta-value" style="font-family:monospace;font-size:12px">${review.id}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Overall Score</div><div class="detail-meta-value" style="color:${scoreColor(review.overallScore)}">${review.overallScore} / 100</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Risk Level</div><div class="detail-meta-value"><span class="risk-badge ${review.riskLabel}">${capitalize(review.riskLabel)}</span></div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Status</div><div class="detail-meta-value"><span class="status-badge status-${review.status}">${statusLabel(review.status)}</span></div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Content Type</div><div class="detail-meta-value">${contentTypeLabel(review.contentType)}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Channel</div><div class="detail-meta-value">${capitalize(review.channel)}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Stage</div><div class="detail-meta-value">${capitalize(review.workflowStage?.replace('-', ' ') || '')}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Reviewer</div><div class="detail-meta-value">${review.user || '—'}</div></div>
          </div>
        </div>

        <div class="section-card">
          <h2 class="section-title">Original Content</h2>
          <div class="original-content-preview">${escapeHtml(review.content || '')}</div>
        </div>

        ${review.notes ? `<div class="section-card"><h2 class="section-title">Reviewer Notes</h2><p style="font-size:13px;color:var(--text-secondary);line-height:1.6">${escapeHtml(review.notes)}</p></div>` : ''}
      </div>

      <div>
        <div class="section-card">
          <h2 class="section-title">Flags (${review.flags?.length || 0})</h2>
          ${(review.flags || []).map(flag => `
            <div class="flagged-item" style="margin-bottom:10px">
              <div class="flagged-header" style="cursor:default">
                <div class="flagged-header-left">
                  <div class="flag-category-dot" style="background:${catColors[flag.type] || '#6b7fff'}"></div>
                  <div class="flagged-title">${flag.label || capitalize(flag.type)}</div>
                </div>
                <span class="risk-badge ${flag.severity}">${capitalize(flag.severity)}</span>
              </div>
              <div class="flagged-body open">
                <div class="flagged-quote">"${escapeHtml(flag.snippet)}"</div>
                <div class="flagged-action">${escapeHtml(flag.action)}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="section-card">
          <h2 class="section-title">Required Review Path</h2>
          ${(review.reviewers?.required || []).map(r => `<span class="reviewer-chip required">👤 ${r}</span>`).join('')}
          ${(review.reviewers?.escalation || []).map(r => `<span class="reviewer-chip escalation">⚠️ ${r}</span>`).join('')}
        </div>

        <div class="section-card">
          <div class="section-header">
            <h2 class="section-title">Actions</h2>
            <button class="btn-secondary" onclick="exportReview('${review.id}')">Export</button>
          </div>
          ${(review.actions || []).map((a, i) => `
            <div class="action-item">
              <div class="action-number">${i + 1}</div>
              <div class="action-text">${escapeHtml(a)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Use 'review-detail' view key
  const viewEl = document.getElementById('view-review-detail');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (viewEl) viewEl.classList.add('active');
  AppState.currentView = 'review-detail';
  document.querySelector('.main-content').scrollTo(0, 0);
}

// ============================================================
// GOVERNANCE SETTINGS
// ============================================================

function renderGovernanceSettings() {
  const config = AppState.governanceConfig || DEFAULT_CONFIG;

  // Thresholds
  document.getElementById('thresh-medium').value = config.thresholds?.medium || 30;
  document.getElementById('thresh-high').value = config.thresholds?.high || 60;
  document.getElementById('thresh-critical').value = config.thresholds?.critical || 80;
  document.getElementById('thresh-stop').value = config.thresholds?.stopPublish || 75;

  // Watch terms
  renderWatchTerms(config.watchTerms || []);

  // Reviewer mappings
  const mappingsContainer = document.getElementById('reviewer-mappings');
  const mappings = config.reviewerMappings || DEFAULT_CONFIG.reviewerMappings;
  mappingsContainer.innerHTML = Object.entries(mappings).map(([type, reviewers]) => `
    <div class="reviewer-row">
      <div class="reviewer-row-label">${contentTypeLabel(type)}</div>
      <div class="reviewer-chips">${reviewers.map(r => `<span class="reviewer-chip standard">${r}</span>`).join('')}</div>
    </div>
  `).join('');

  // Policies
  const policies = config.policies || DEFAULT_CONFIG.policies;
  document.getElementById('policy-no-ai-testimonials').checked = policies.noAiTestimonials ?? true;
  document.getElementById('policy-no-unsourced-stats').checked = policies.noUnsourcedStats ?? true;
  document.getElementById('policy-no-customer-names').checked = policies.noCustomerNames ?? true;
  document.getElementById('policy-no-regulated-claims').checked = policies.noRegulatedClaims ?? true;
  document.getElementById('policy-founder-approval').checked = policies.founderApproval ?? true;
  document.getElementById('policy-ai-disclosure').checked = policies.aiDisclosure ?? false;
}

function renderWatchTerms(terms) {
  const container = document.getElementById('watch-terms-list');
  container.innerHTML = terms.map((term, i) => `
    <span class="watch-term-chip">
      ${escapeHtml(term)}
      <button class="watch-term-remove" onclick="removeWatchTerm(${i})">✕</button>
    </span>
  `).join('');
}

function addWatchTerm() {
  const input = document.getElementById('new-watch-term');
  const term = input.value.trim().toLowerCase();
  if (!term) return;
  const config = AppState.governanceConfig || { ...DEFAULT_CONFIG };
  if (!config.watchTerms) config.watchTerms = [];
  if (!config.watchTerms.includes(term)) {
    config.watchTerms.push(term);
    AppState.governanceConfig = config;
    renderWatchTerms(config.watchTerms);
    input.value = '';
    showToast(`Watch term "${term}" added.`, 'success');
  } else {
    showToast('That term is already in the list.', 'error');
  }
}

function removeWatchTerm(index) {
  const config = AppState.governanceConfig || { ...DEFAULT_CONFIG };
  config.watchTerms.splice(index, 1);
  AppState.governanceConfig = config;
  renderWatchTerms(config.watchTerms);
}

function saveGovernanceSettings() {
  const config = AppState.governanceConfig || { ...DEFAULT_CONFIG };

  config.thresholds = {
    medium: parseInt(document.getElementById('thresh-medium').value) || 30,
    high: parseInt(document.getElementById('thresh-high').value) || 60,
    critical: parseInt(document.getElementById('thresh-critical').value) || 80,
    stopPublish: parseInt(document.getElementById('thresh-stop').value) || 75,
  };

  config.policies = {
    noAiTestimonials: document.getElementById('policy-no-ai-testimonials').checked,
    noUnsourcedStats: document.getElementById('policy-no-unsourced-stats').checked,
    noCustomerNames: document.getElementById('policy-no-customer-names').checked,
    noRegulatedClaims: document.getElementById('policy-no-regulated-claims').checked,
    founderApproval: document.getElementById('policy-founder-approval').checked,
    aiDisclosure: document.getElementById('policy-ai-disclosure').checked,
  };

  AppState.governanceConfig = config;
  saveState();
  showToast('Governance configuration saved successfully.', 'success');
}

// ============================================================
// EXPORT FUNCTIONALITY
// ============================================================

function exportResults() {
  const review = AppState.currentReview;
  if (!review) return;
  showExportModal(review);
}

function exportReview(reviewId) {
  const review = AppState.reviews.find(r => r.id === reviewId);
  if (!review) return;
  showExportModal(review);
}

function showExportModal(review) {
  const modal = document.getElementById('export-modal');
  const content = document.getElementById('export-content');
  modal.style.display = 'flex';

  const flags = (review.flags || []).map((f, i) =>
    `  ${i + 1}. [${capitalize(f.severity).toUpperCase()}] ${f.label}\n     Excerpt: "${f.snippet.substring(0, 80)}..."\n     Action: ${f.action}`
  ).join('\n\n');

  const exportText = `
╔══════════════════════════════════════════════════════════════╗
║           AI CONTENT RISK CHECKER — REVIEW SUMMARY          ║
╚══════════════════════════════════════════════════════════════╝

REVIEW ID:       ${review.id}
DATE:            ${formatDateLong(review.date)}
REVIEWER:        ${review.user || 'Not assigned'}
CONTENT TYPE:    ${contentTypeLabel(review.contentType)}
CHANNEL:         ${capitalize(review.channel)}
WORKFLOW STAGE:  ${capitalize(review.workflowStage?.replace(/-/g, ' ') || '')}

──────────────────────────────────────────────────────────────
OVERALL RISK ASSESSMENT
──────────────────────────────────────────────────────────────
Overall Score:   ${review.overallScore} / 100
Risk Level:      ${capitalize(review.riskLabel)} Risk
Status:          ${statusLabel(review.status)}

Category Breakdown:
  Claims Risk:              ${review.categoryScores?.claims || 0} / 100
  Citation / Source Risk:   ${review.categoryScores?.citation || 0} / 100
  Testimonial Risk:         ${review.categoryScores?.testimonial || 0} / 100
  Privacy Risk:             ${review.categoryScores?.privacy || 0} / 100
  Bias Risk:                ${review.categoryScores?.bias || 0} / 100

──────────────────────────────────────────────────────────────
REQUIRED REVIEW PATH
──────────────────────────────────────────────────────────────
Required Reviewers: ${(review.reviewers?.required || []).join(', ') || 'Standard editorial review'}
Escalation:         ${(review.reviewers?.escalation || []).join(', ') || 'None required'}

──────────────────────────────────────────────────────────────
FLAGGED ISSUES (${(review.flags || []).length} total)
──────────────────────────────────────────────────────────────
${flags || '  No issues flagged.'}

──────────────────────────────────────────────────────────────
RECOMMENDED ACTIONS
──────────────────────────────────────────────────────────────
${(review.actions || []).map((a, i) => `  ${i + 1}. ${a}`).join('\n')}

──────────────────────────────────────────────────────────────
NOTES
──────────────────────────────────────────────────────────────
${review.notes || 'No reviewer notes added.'}

──────────────────────────────────────────────────────────────
GOVERNANCE DISCLAIMER
──────────────────────────────────────────────────────────────
This review supports human oversight. It flags likely issues for
review and does not guarantee compliance, replace legal judgment,
or certify content as publication-ready. All final decisions
belong to named human reviewers.

Generated by AI Content Risk Checker · ${new Date().toISOString()}
`.trim();

  content.innerHTML = `<div class="export-content-text">${escapeHtml(exportText)}</div>`;

  // Store for copy
  content._exportText = exportText;
}

function copyExportContent() {
  const content = document.getElementById('export-content');
  const text = content._exportText || content.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Review summary copied to clipboard.', 'success');
  }).catch(() => {
    showToast('Could not copy. Please select and copy manually.', 'error');
  });
}

function closeExportModal() {
  document.getElementById('export-modal').style.display = 'none';
}

function exportAuditLog() {
  const reviews = AppState.reviews;
  const csvRows = [
    ['Review ID', 'Title', 'Content Type', 'Channel', 'Date', 'Score', 'Risk Level', 'Status', 'Flags', 'Required Reviewers', 'Escalation', 'Notes'].join(',')
  ];

  for (const r of reviews) {
    csvRows.push([
      r.id,
      `"${r.title}"`,
      contentTypeLabel(r.contentType),
      r.channel,
      formatDateLong(r.date),
      r.overallScore,
      capitalize(r.riskLabel),
      statusLabel(r.status),
      (r.flags || []).length,
      `"${(r.reviewers?.required || []).join('; ')}"`,
      `"${(r.reviewers?.escalation || []).join('; ')}"`,
      `"${r.notes || ''}"`,
    ].join(','));
  }

  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `content-risk-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Audit log exported as CSV.', 'success');
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateLong(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function scoreColor(score) {
  if (score >= 80) return 'var(--risk-critical)';
  if (score >= 60) return 'var(--risk-high)';
  if (score >= 30) return 'var(--risk-medium)';
  return 'var(--risk-low)';
}

function statusLabel(status) {
  const labels = {
    draft: 'Draft', scanned: 'Scanned', 'needs-edits': 'Needs Edits',
    'needs-human': 'Needs Human Review', escalated: 'Escalated',
    approved: 'Approved', rejected: 'Rejected', 'published-exception': 'Published w/ Exception'
  };
  return labels[status] || capitalize(status);
}

function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderDashboard();
});
